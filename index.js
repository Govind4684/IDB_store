
// window.URL = window.URL || window.webkitURL;

// Register service worker to control making site work offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(
      "/sw.js",
    )
    .then(() => console.log("Service Worker Registered"));
}

// Create needed constants
const list = document.querySelector('ul');
const titleInput = document.querySelector('#title');
const bodyInput = document.querySelector('#body');
const attachement = document.querySelector('#attachement');
const form = document.querySelector('form');
const submitBtn = document.querySelector('form button');
const inputSection = document.querySelector('.new-note');

let imgFile=null;

////////////////////// DB configuration and setup below

let db;

const openRequest = window.indexedDB.open("notes_db", 1);

openRequest.addEventListener("error", () => {
    console.error("Database failed to open");
});

openRequest.addEventListener("success", () => {
    console.log("Database opened successfully");

    db = openRequest.result;

    displayData();
});

openRequest.addEventListener("upgradeneeded", (e) => {
    db = e.target.result;

    const objectStore = db.createObjectStore("notes_os", {
        keyPath: "id",
        autoIncrement: true,
    });

    objectStore.createIndex("title","title",{ unique: false });
    objectStore.createIndex("body","body",{ unique: false });
    objectStore.createIndex("image","image",{ unique: false });

    console.log("Database setup complete");
});


// Manage Image upload
attachement.addEventListener("change", handleFiles, false);

function handleFiles() {
  const files = this.files;
 
  console.log(files);

  if (!files.length) {
      console.log("no image selected");
      imgFile = null;
  } else {

      for (let i = 0; i < files.length; i++) {
          const img = document.createElement("img");
          img.src = window.URL.createObjectURL(files[i]);      
         
          // Send data to IDB                 
          imgFile = files[i];
          console.log(imgFile);

          // img.onload = function() {
          //     window.URL.revokeObjectURL(this.src);
          // };
          form.appendChild(img);
      }
  }
}

form.addEventListener("submit", addData);

function addData(e) {
    e.preventDefault();

    let newItem = {};

    if(imgFile != null){

        const fileReader = new FileReader();
        fileReader.readAsDataURL(imgFile);
        fileReader.onload = (event) => {
            const imageObject = {
              data: event.target.result,
            }
            newItem = { title: titleInput.value, body: bodyInput.value, image: imageObject };
        }      
    } else {
            newItem = { title: titleInput.value, body: bodyInput.value, image: null };
    }
            
      const transaction = db.transaction(["notes_os"], "readwrite");

      const objectStore = transaction.objectStore("notes_os");

      const addRequest = objectStore.add(newItem);

      addRequest.addEventListener("success", () => {
        if(imgFile!==null){
          form.removeChild(document.querySelector("form img"));
          attachement.value = "";    
          imgFile = null;
        }
        titleInput.value = "";
        bodyInput.value = "";                
      });
  
      transaction.addEventListener("complete", () => {
          console.log("Transaction completed: database modification finished.");
          // update the display of data to show the newly added item, by running displayData() again.
          displayData();
      })
  
      transaction.addEventListener("error", () =>
          console.log("Transaction not opened due to error"),
      );      
    
}


function displayData() {

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
  
    // cursor iterates through all the different data items in the store
    const objectStore = db.transaction("notes_os").objectStore("notes_os");
    objectStore.openCursor(null, "prev").addEventListener("success", (e) => {
      // Get a reference to the cursor
      const cursor = e.target.result;
  
      // If there is still another data item to iterate through, keep running this code
      if (cursor) {
       
        const listItem = document.createElement("li");
        const h3 = document.createElement("h3");
        const para = document.createElement("pre");

        if(cursor.value.image != null){
          const img = document.createElement("img");

          const base64String = cursor.value.image.data;
          img.src = base64String;

          listItem.appendChild(img);
        }

        // // uniquely identify data for update purpose


        h3.addEventListener("click",updateData);
        para.addEventListener("click",updateData);

        listItem.appendChild(h3);
        listItem.appendChild(para);
        list.appendChild(listItem);
  
        // Put the data from the cursor inside the h3 and para
        h3.textContent = cursor.value.title;
        para.textContent = cursor.value.body;
  
        // Store the ID of the data item inside an attribute on the listItem, so we know
        // which item it corresponds to.
        listItem.setAttribute("data-note-id", cursor.value.id);
  
        // Delete note button
        const deleteBtn = document.createElement("button");
        deleteBtn.setAttribute("class","delete-btn");
        listItem.appendChild(deleteBtn);
        deleteBtn.textContent = "Delete";
  
        // deleteItem()
        deleteBtn.addEventListener("click", confirmDelete);

        // Update note button
        const updateBtn = document.createElement("button");
        updateBtn.setAttribute("class","update-btn");
        listItem.appendChild(updateBtn);
        updateBtn.textContent = "Update";

        // updateItem()
        updateBtn.addEventListener("click", updateItem);
  
        // Iterate to the next item in the cursor
        cursor.continue();
      } else {
        // Again, if list item is empty, display a 'No notes stored' message
        if (!list.firstChild) {
          const listItem = document.createElement("li");
          listItem.textContent = "No notes stored.";
          list.appendChild(listItem);
        }
        // if there are no more cursor items to iterate through, say so
        console.log("Notes all displayed");
      }
    });
  }


// Two Step for delete confirmation
function confirmDelete() {
  let deleteConfirm = 0;

  const confirmBtn = document.createElement("button");  
  confirmBtn.setAttribute("class","sureDelete-btn");
  confirmBtn.textContent = "Sure";

  this.replaceWith(confirmBtn);

  confirmBtn.addEventListener("click",deleteItem);

}
  
// Define the deleteItem() function
function deleteItem(e) {
    
    // retrieve the name of the task we want to delete. We need
    // to convert it to a number before trying to use it with IDB; IDB key
    // values are type-sensitive.
    const noteId = Number(e.target.parentNode.getAttribute("data-note-id"));
  
    // open a database transaction and delete the task, finding it using the id we retrieved above
    const transaction = db.transaction(["notes_os"], "readwrite");
    const objectStore = transaction.objectStore("notes_os");
    const deleteRequest = objectStore.delete(noteId);
  
    // report that the data item has been deleted
    transaction.addEventListener("complete", () => {
      // delete the parent of the button
      // which is the list item, so it is no longer displayed
      e.target.parentNode.parentNode.removeChild(e.target.parentNode);
      console.log(`Note ${noteId} deleted.`);
  
      // Again, if list item is empty, display a 'No notes stored' message
      if (!list.firstChild) {
        const listItem = document.createElement("li");
        listItem.textContent = "No notes stored.";
        list.appendChild(listItem);
      }
    });
  }

function updateData(){
  textPrev = this.textContent;
  let inputArea;
  if (this.nodeName == 'H3'){
    inputArea = document.createElement("input");
    inputArea.setAttribute("type","text");
  } else if (this.nodeName == 'PRE'){
    inputArea = document.createElement("textarea");
  }
  
  inputArea.setAttribute("class",`${this.nodeName}`);
  inputArea.value = textPrev;
  this.replaceWith(inputArea);
}

function updateItem(e) {

    const note = e.target.parentNode;
    const noteId = Number(note.getAttribute("data-note-id"));
    let noteHeader,notePara;
    

    if(note.querySelector(".H3") && note.querySelector(".PRE")){

      noteHeader = note.querySelector(".H3").value.trim();
      notePara = note.querySelector(".PRE").value.trim();

    } else if (note.querySelector(".H3")) {

      noteHeader = note.querySelector(".H3").value.trim();
      notePara = note.querySelector("pre").textContent.trim();

    } else if (note.querySelector(".PRE")) {

      notePara = note.querySelector(".PRE").value.trim();
      noteHeader = note.querySelector("h3").textContent.trim();

    } else {
      notePara = note.querySelector("pre").textContent.trim();
      noteHeader = note.querySelector("h3").textContent.trim();
    }

    // cursor iterates through all the different data items in the store
    // const objectStore = db.transaction("notes_os").objectStore("notes_os");
    // objectStore.openCursor(null, "prev").addEventListener("success", (e) => {
    // open a database transaction and delete the task, finding it using the id we retrieved above
    const transaction = db.transaction(["notes_os"], "readwrite");
    const objectStore = transaction.objectStore("notes_os");
    
    objectStore.openCursor().addEventListener("success", (e) => {
      const cursor = e.target.result;

      if(cursor){
        if(cursor.value.id == noteId){
          const updateData = cursor.value;
          updateData.title = noteHeader;
          updateData.body = notePara;
          const request = cursor.update(updateData);
          request.onsuccess = () => {
            displayData();
            console.log("Updated successfully!");
          };
        } else {
          cursor.continue();
        }
      }

    });    

}