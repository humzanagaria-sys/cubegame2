export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connection = null;
        this.isMultiplayer = false;
        this.isHost = false;
    }
    initHost(onIdReady, onClientConnect) {
        this.peer = new Peer();
        this.peer.on('open', (id) => {
            this.isHost = true;
            this.isMultiplayer = true;
            onIdReady(id);
        });
        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupDataChannels();
            onClientConnect();
        });
    }
    initJoin(targetId, onConnect) {
        this.peer = new Peer();
        this.peer.on('open', () => {
            this.isHost = false;
            this.isMultiplayer = true;
            this.connection = this.peer.connect(targetId);
            this.connection.on('open', () => {
                this.setupDataChannels();
                onConnect();
            });
        });
    }
    setupDataChannels() {
        this.connection.on('data', (data) => {
            if (data.type === 'move') {
                this.game.updateRemotePlayerPosition(this.connection.peer, data.x, data.z);
            }
            if (data.type === 'shoot') {
                this.game.spawnRemoteLaser(data.origin, data.dir);
            }
            if (data.type === 'bossSync' && !this.isHost) {
                this.game.syncBossData(data);
            }
        });
    }
    sendMovement(x, z) {
        if (this.isMultiplayer && this.connection?.open) {
            this.connection.send({ type: 'move', x, z });
        }
    }
    sendLaser(origin, dir) {
        if (this.isMultiplayer && this.connection?.open) {
            this.connection.send({ type: 'shoot', origin, dir });
        }
    }
    sendBoss(data) {
        if (this.isMultiplayer && this.isHost && this.connection?.open) {
            this.connection.send({ type: 'bossSync', ...data });
        }
    }
}
