import type { AppData, DataSet, Repair } from './types';

const DB_NAME = 'repair-queue-local';
const STORE = 'workspace';
type StorageScope = 'real' | 'demo';

function dataKey(scope: StorageScope): string {
  return scope === 'demo' ? 'demo:active' : 'active';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage could not be opened. Check private-browsing or site-storage settings.'));
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Repair Queue could not save data on this device.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function loadData(scope: StorageScope = 'real'): Promise<AppData | null> {
  return (await transact('readonly', (store) => store.get(dataKey(scope)))) as AppData | null;
}

export async function saveDataset(dataset: DataSet, scope: StorageScope = 'real'): Promise<AppData> {
  const data = { dataset, repairs: [] };
  await transact('readwrite', (store) => store.put(data, dataKey(scope)));
  return data;
}

export async function saveRepair(data: AppData, repair: Repair, scope: StorageScope = 'real'): Promise<AppData> {
  const next = { ...data, repairs: [...data.repairs.filter((item) => item.cardId !== repair.cardId), repair] };
  await transact('readwrite', (store) => store.put(next, dataKey(scope)));
  return next;
}

export async function replaceData(data: AppData, scope: StorageScope = 'real'): Promise<void> {
  await transact('readwrite', (store) => store.put(data, dataKey(scope)));
}

export async function clearData(scope: StorageScope = 'real'): Promise<void> {
  await transact('readwrite', (store) => store.delete(dataKey(scope)));
}
