const vorpal = require("vorpal")();
const Table = require("cli-table");
const Blockchain = require("./blockchain");
const rsa = require("./rsa");
const blockchain = new Blockchain();

//以table的格式输出数据
function formatLog(data) {
  if (!data || data.length === 0) {
    return;
  }
  if (!Array.isArray(data)) {
    data = [data];
  }
  const head = Object.keys(data[0]);
  // instantiate
  const table = new Table({
    head: head,
    colWidths: new Array(head.length).fill(20), //[10, 30, 30, 15, 20, 10],
  });
  const rows = data.map(row => {
    return head.map(key => JSON.stringify(row[key], null, 1));
  });
  table.push(...rows);
  console.log(table.toString());
}

// 输入mine进行挖矿
vorpal.command("mine", "挖矿").action(function(args, callback) {
  const newBlock = blockchain.mine(rsa.keys.pub);
  if (newBlock) {
    //this.log(newBlock);
    formatLog(newBlock);
  }
  // 不执行 callback()， 执行命令后就直接退出了
  callback();
});

// 输入chain进行查看区块链内容
vorpal.command("blockchain", "查看区块链内容").action(function(args, callback) {
  //this.log(blockchain.blockchain);
  formatLog(blockchain.blockchain);
  callback();
});

// 转账，使用<param>可以定义输入的参数
vorpal.command("trans <to> <amount>", "转账").action(function({ to, amount }, callback) {
  // 本地公钥当做转账地址
  let trans = blockchain.transfer(rsa.keys.pub, to, amount);
  if (trans) {
    formatLog(trans);
  } else {
    console.log("转账失败");
  }

  callback();
});

vorpal.command("detail <index> ", "查看详情").action(function(args, callback) {
  this.log(JSON.stringify(blockchain.blockchain[args.index], null, 2));

  callback();
});

vorpal.command("balance <address> ", "查看余额").action(function(args, callback) {
  const balance = blockchain.balance(args.address);
  if (balance) {
    formatLog({ balance, address: args.address });
  }
  callback();
});

vorpal.command("pub", "查看公钥").action(function(args, callback) {
  console.log(rsa.keys.pub);
  callback();
});

vorpal.command("peers", "查看网络节点列表").action(function(args, callback) {
  formatLog(blockchain.peers);
  callback();
});

vorpal.command("chat <msg>", "跟别的节点聊天").action(function(args, callback) {
  blockchain.boardcast({ type: "hi", data: args.msg });
  callback();
});

vorpal.command("pending", "查看还没被打包的交易").action(function(args, callback) {
  formatLog(blockchain.data);
  callback();
});

// 先执行下帮助命令
vorpal.exec("help");
vorpal.delimiter("wenmu-chain$").show();
