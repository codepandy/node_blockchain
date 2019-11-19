const dgram = require("dgram");
const udp = dgram.createSocket("udp4");

// udp收信息
udp.on("message", (data, remote) => {
  console.log("accept message" + DataCue.toString());
});

udp.on("listening", function() {
  const address = udp.address();
  console.log(`udp server is listening ${address.address}:${address.port}`);
});

// bind(0)就是会随机分配一个端口
udp.bind(0);

// 发送信息
function send(message, port, host) {
  console.log(`send message`, message, port, host);
  udp.send(Buffer.from(message), port, host);
}

// process.argv 属性返回一个数组，其中包含当启动 Node.js 进程时传入的命令行参数
const port = Number(process.argv[2]);
const host = process.argv[3];

if (port && host) {
  send("使用upd发送的信息", port, host);
}
