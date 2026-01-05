
import { BackendConfig, IDataService } from '../types';
import { LocalDataService } from './dataService';
import { FirebaseDataService } from './firebaseService';

let instance: IDataService | null = null;

export class DataServiceFactory {
    static create(config: BackendConfig): IDataService {
        if (!instance) {
            instance = config.mode === 'firebase' 
                ? new FirebaseDataService(config) 
                // Fix: LocalDataService does not define a constructor taking arguments.
                : new LocalDataService();
        }
        return instance;
    }
    
    // Hilfsmethode zum Zurücksetzen der Instanz (z.B. bei API-Wechsel)
    static reset() {
        instance = null;
    }
}
