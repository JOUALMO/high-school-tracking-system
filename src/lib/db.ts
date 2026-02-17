export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("StudyFlowDB", 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains("store"))
                req.result.createObjectStore("store", { keyPath: "key" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function idbGet(key: string): Promise<any> {
    try {
        const db = await openDB();
        return new Promise((res, rej) => {
            const req = db
                .transaction("store", "readonly")
                .objectStore("store")
                .get(key);
            req.onsuccess = () => res(req.result?.value ?? null);
            req.onerror = () => rej(req.error);
        });
    } catch {
        return null;
    }
}

export async function idbSet(key: string, value: any): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((res, rej) => {
            const req = db
                .transaction("store", "readwrite")
                .objectStore("store")
                .put({ key, value });
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
        });
    } catch { }
}

export async function idbClear(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((res, rej) => {
            const req = db
                .transaction("store", "readwrite")
                .objectStore("store")
                .clear();
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
        });
    } catch { }
}
