import { EventEmitter } from 'events';

const hub = new EventEmitter();
hub.setMaxListeners(100);

export default hub;
