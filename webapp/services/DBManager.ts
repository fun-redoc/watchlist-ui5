// this function only translates from indexDB callbacs to mor simple usage of promisses and async
// and provides typed access

// usage:
// define a type or an interface you want to store.
// this interface has to hhave an id property of type number (or exptend the TProvideNumericID interface)
// the access to the function is then typed by this generic
// in case of success promise resolves with the given type, otherwise the promise rejects with type Error

export interface TProvideNumericID {
  id?:number
}

export interface DBManager<T extends TProvideNumericID> {
  add: (note:T) => Promise<number>
  update: (note:T) => Promise<boolean>
  del:(id:number) => Promise<boolean>
  get: (id:number) => Promise<T>
  list: () => Promise<T[]>
  clearAll: () => Promise<void>
  accessDBStore:() => Promise<IDBObjectStore>
}

export interface IndexProps {
  indexName:string
  isUnique:boolean
}

// Define a class for the database manager
export async function  mkDBManager<T extends TProvideNumericID>(dbName:string, storeName:string, version:number, indizes?:IndexProps[]):Promise<DBManager<T>> {

  // Open the database and create the object store if needed
  const db:IDBDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(dbName, version)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onupgradeneeded = (evt) => {
        const _db = request.result
        if (!_db.objectStoreNames.contains(storeName)) {
          // Create the object store with an auto-incrementing key
          const store = _db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true })
          if(!store) {
            console.error("no store available, cannot create indizes, access to store may fail.")
            reject(new DOMException("Error happened, please try later"))
          } else {
            indizes?.forEach( i => {
                store.createIndex(i.indexName, i.indexName, {unique:i.isUnique})
              }
            )
          }
        }
        //resolve(_db)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      }
      request.onsuccess = () => {
        // Save the database instance
        resolve(request.result)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onerror = () => {
        // Handle errors
        console.error("Database error: " + request.error)
        reject(request.error)
      }
    }
  )

  //async function _getStoreAsync():Promise<IDBObjectStore> {
  //  return new Promise<IDBObjectStore>((resolve, reject) => {
  //    if(!db) {return reject(new Error("DB not initialized."))}
  //    // Start a transaction and get the object store
  //    const transaction = db.transaction([storeName], "readwrite")
  //    const store = transaction.objectStore(storeName)
  //    resolve(store)
  //  })
  //}
  // Improvment: - if you only need the store for reading, make it read only => seems faster
  function _getStoreSync():IDBObjectStore {
    if(!db) {throw new Error("DB not initialized.")}
    // Start a transaction and get the object store
    const transaction = db.transaction([storeName], "readwrite")
    const store = transaction.objectStore(storeName)
    return store
  }

  /**
   * Add a data object to the store
   * @param note 
   * @returns key:number
   */
  async function add(note: T):Promise<number> {
    return new Promise<number>((resolve, reject) => {
      if(!db) {return reject(new Error("DB not initialized."))}

      // Start a transaction and get the object store
      const transaction = db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      // Add the data object to the store
      const request = store.add(note)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onsuccess = () => {
        // Success callback
        console.log("Data added: " + request.result)
        resolve(request.result.valueOf() as number)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onerror = () => {
        // Error callback
        console.error("Data error: " + request.error)
        reject(new Error("Failed to save data."))
      }
    })
  }

  /**
   * Add a data object to the store
   * @param note 
   * @returns key:number
   */
  async function update(note: T):Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const store = _getStoreSync()
      const request = store.put(note)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onsuccess = () => {
        // Success callback
        console.log("Data updated: " + request.result)
        resolve(true)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onerror = () => {
        // Error callback
        console.error("Data error: " + request.error)
        reject(new Error("Failed to save data."))
      }
    })
  }

  /**
   * Add a data object to the store
   * @param note 
   * @returns key:number
   */
  async function del(id: number):Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const store = _getStoreSync()
      const request = store.delete(id)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onsuccess = () => {
        // Success callback
        console.log("Data deleted: ")
        resolve(true)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onerror = () => {
        // Error callback
        console.error("Data error: " + request.error)
        reject(new Error("Failed to save data."))
      }
    })
  }

  // Get a data object by its key
  async function get(key: number):Promise<T> {
    return new Promise<T>((resolve, reject)=>{
      if(!db) {return reject(new Error("DB not initialized"))}
      // Start a transaction and get the object store
      const transaction = db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      // Get the data object by its key
      const request = store.get(key)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onsuccess = () => {
        // Success callback
        const data = request.result as T
        resolve(data)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      request.onerror = () => {
        // Error callback
        console.error("Data error: " + request.error)
        reject( new Error("Failed to fetch data."))
      }
    })
  }

  async function list():Promise<T[]> {
    return new Promise<T[]>((resolve, reject)=>{
      if(!db) {return reject(new Error("DB not initialized"))}
      // Start a transaction and get the object store
      const transaction = db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      // Get the data object by its key
      const cursorRequest = store.openCursor()
      cursorRequest.onerror = () => {
        // Error callback
        console.error("Data error: " + cursorRequest.error)
        reject( new Error("Failed to fetch data."))
      }
      const notes:T[] = []
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if(cursor) {
          const dataRequest = store.get(cursor.key)
          dataRequest.onerror = () => {
            // Error callback
            console.error("Data error: " + cursorRequest.error)
            reject( new Error("Failed to fetch data."))
          }
          dataRequest.onsuccess = () => {
            const data = dataRequest.result
            notes.push(data)
          }
          cursor.continue()
        } else {
          // no more data
          resolve(notes)
        }
      }
    })
  }

  async function clearAll():Promise<void> {
    return new Promise<void>((resolve, reject)=>{
      if(!db) {return reject(new Error("DB not initialized"))}
      // Start a transaction and get the object store
      const transaction = db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const req = store.clear();
      req.onsuccess = function() {
        console.info("Store cleared");
        resolve()
      }
      req.onerror = function () {
        console.error("clearObjectStore:", req.error);
        reject(new Error(req.error?.message));
      }
    })
  }

  async function accessDBStore():Promise<IDBObjectStore> {
    return new Promise<IDBObjectStore>((resolve, reject)=>{
      if(!db) {return reject(new Error("DB not initialized"))}
        resolve(_getStoreSync())
    })
  }

  // Improvement: update, add, get, clearAll, delete have lots of bolierplate which cann be abstracted and unified eg. using callback
  return new Promise<DBManager<T>>(resolve => resolve({add, update, del, get, list, clearAll, accessDBStore }))
}