const crypto = require("crypto");
const dgram = require("dgram");
const rsa = require("./rsa");

const initBlock = {
  index: 0,
  hash: "",
  prevHash: "0",
  timestamp: "1573979040090",
  data: "the first blockchian of wenmu.",
  nonce: 0,
};

class Blockchain {
  constructor() {
    // 完整的区块链，默认是空，连创世区块都没有
    this.blockchain = [initBlock];
    // 当前区块的信息，基本上都是交易信息
    this.data = [];
    //区块的难度，算hash时用
    this.diffcult = 3;

    // 所有的网络节点，address,port
    this.peers = [];
    this.remote = {};
    // 种子节点
    this.seed = { port: 8001, address: "localhost" };
    this.udp = dgram.createSocket("udp4");
    this.init();
  }

  init() {
    this.bindP2p();
    this.bindExit();
  }

  // 绑定
  bindP2p() {
    // 网络发来的消息
    this.udp.on("message", (data, remote) => {
      //{
      // type:'要干什么'
      // data: 具体传递的信息
      //}
      const action = JSON.parse(data);
      if (action.type) {
        this.dispatch(action, remote);
      }
    });

    this.udp.on("listening", () => {
      const address = this.udp.address();
      console.log(`[信息]：udp监听完毕 端口是：${address.port}`);
    });

    // 区分种子节点和普通节点，普通节点的端口0即可，随意一个空闲的即可
    // 种子节点的端口必须约定好
    // console.log(process.argv);
    const port = Number(process.argv[2] || 0);
    this.startNode(port);
  }

  // 退出进程
  bindExit() {
    process.on("exit", () => {
      console.log(`[信息]：网络一线牵，珍惜这段缘 goodbye!`);
    });
  }

  startNode(port) {
    this.udp.bind(port);
    // 如果不是种子节点，需要发送一个消息告诉种子，我来了
    if (port !== 8001) {
      this.send({ type: "newpeer" }, this.seed.port, this.seed.address);
    }
    // 把种子节点加入到本地节点中
    this.peers.push(this.seed);
  }

  send(message, port, address) {
    this.udp.send(JSON.stringify(message), port, address);
  }

  boardcast(action) {
    this.peers.forEach(peer => {
      this.send(action, peer.port, peer.address);
    });
  }

  dispatch(action, remote) {
    // 接收到网络的消息在这里处理
    switch (action.type) {
      case "newpeer":
        // 种子节点要做的事情
        // 1.你的公网IP和Port是什么
        this.send({ type: "remoteAddress", data: remote }, remote.port, remote.address);
        // 2.现在全部节点的列表
        this.send({ type: "peerList", data: this.peers }, remote.port, remote.address);
        // 3.告诉所有已知节点，来了一个新朋友，快打招呼
        this.boardcast({ type: "sayhi", data: remote });
        // 4.告诉你现在区块链的数据
        this.send(
          {
            type: "blockchain",
            data: JSON.stringify({
              blockchain: this.blockchain,
              trans: this.data,
            }),
          },
          remote.port,
          remote.address
        );
        this.peers.push(remote);
        console.log("你好，新朋友，回头请你喝茶。", remote);
        break;
      case "blockchain":
        // 同步本地链
        const allData = JSON.parse(action.data);
        const newChain = allData.blockchain;
        const newTrans = allData.trans;
        this.replaceChain(newChain);
        this.replaceTrans(newTrans);
        break;
      case "remoteAddress":
        // 存储远程信息，退出时使用
        this.remote = action.data;
        break;
      case "peerList":
        // 远程告诉我，现在的节点列表
        const newPeers = action.data;
        this.addPeers(newPeers);
        break;
      case "sayhi":
        let remotePeer = action.data;
        //this.peers.push(remotePeer);
        this.addPeers([remotePeer]);
        console.log(`[信息]：新朋友你好，相识就是缘分，请你喝茶。`);
        this.send({ type: "hi" }, remotePeer.port, remotePeer.address);
        break;
      case "hi":
        console.log(`hi,我是：${remote.address}:${remote.port}-${action.data || ""}`);
        break;
      case "mine":
        // 有人挖矿成功
        const newBlock = action.data;
        const lastBlock = this.getLastBlockchain();
        if (lastBlock.hash === newBlock.hash) {
          // 重复的消息
          return;
        }

        if (this.isValidBlock(newBlock, lastBlock)) {
          console.log(`[信息]：有人挖矿成功，让我们一起为他喝彩，动起来！！！`);
          this.blockchain.push(newBlock);
          // 清空本地数据
          this.data = [];
          // 上面有去重的判断，所以不用担心死循环
          this.boardcast({ type: "mine", data: newBlock });
        } else {
          console.log(`[错误]：区块不合法，可惜！！！`);
        }
        break;
      case "trans":
        // 网络受到的交易请求
        // 判断重复交易
        if (!this.data.find(v => this.isEqualObj(v, action.data))) {
          console.log(`[信息]：有新的交易，请注意查收！`);
          this.addTrans(action.data);
          this.boardcast({ type: "trans", data: action.data });
        }
        break;
      default:
        console.log("这个action不认识");
        break;
    }
  }

  isEqualObj(obj1, obj2) {
    const key1 = Object.keys(obj1);
    const key2 = Object.keys(obj2);
    if (key1.length !== key2.length) {
      return false;
    }
    return key1.every(key => obj1[key] === obj2[key]);
  }

  isEqualPeer(peer1, peer2) {
    return peer1.address === peer2.address && peer1.port === peer2.port;
  }

  addTrans(trans) {
    if (this.isValidTransfer(trans)) {
      this.data.push(trans);
    }
  }

  addPeers(peers) {
    peers.forEach(peer => {
      // 判断新节点是否已存在
      if (!this.peers.find(v => this.isEqualObj(peer, v))) {
        this.peers.push(peer);
      }
    });
  }

  getLastBlockchain() {
    return this.blockchain[this.blockchain.length - 1];
  }

  isValidTransfer(trans) {
    // if ("0" === trans.from) {
    //   return true;
    // }
    // 是否是合法的转账
    // 地址即使公钥
    return rsa.verify(trans, trans.from);
  }

  // 挖矿
  mine(address) {
    // 校验交易合法性
    // if (!this.data.every(v => this.isValidTransfer(v))) {
    //   console.log("有无效转账");
    //   return;
    // }
    // 过滤掉不合法的
    this.data = this.data.filter(v => this.isValidTransfer(v));

    // 步骤：
    // 1. 生成新区块
    // 2. 不停的算hash，直到符合难度条件，新增区块

    // 挖矿结束，旷工奖励
    this.transfer("0", address, 100);

    const newBlock = this.generateNewBlock();
    if (this.isValidBlock(newBlock) && this.isValidChain()) {
      this.blockchain.push(newBlock);
      this.data = [];
      console.log(`[信息]:挖矿成功！`);
      this.boardcast({ type: "mine", data: newBlock });
    } else {
      console.log("Error,Invalid Block!", newBlock);
    }
    return newBlock;
  }

  // 生成新区块
  generateNewBlock() {
    const index = this.blockchain.length;
    const prevHash = this.getLastBlockchain().hash;
    const timestamp = Date.now();
    const data = this.data;
    let nonce = 0;
    let hash = this.computeHash(index, prevHash, timestamp, data, nonce);
    while (hash.slice(0, this.diffcult) !== "0".repeat(this.diffcult)) {
      nonce += 1;
      hash = this.computeHash(index, prevHash, timestamp, data, nonce);
    }
    return {
      index,
      prevHash,
      hash,
      timestamp,
      data,
      nonce,
    };
  }

  computeHashForBlock({ index, prevHash, timestamp, data, nonce }) {
    return this.computeHash(index, prevHash, timestamp, data, nonce);
  }

  /**
   * 计算哈希
   * @param {索引} index
   * @param {上一个区块的hash} prevHash
   * @param {时间戳} timestamp
   * @param {数据} data
   * @param {随机值} nonce
   */
  computeHash(index, prevHash, timestamp, data, nonce) {
    return crypto
      .createHash("sha256")
      .update(`${index}${prevHash}${timestamp}${data}${nonce}`)
      .digest("hex");
  }

  // 校验区块
  isValidBlock(newBlock, lastBlock = this.getLastBlockchain()) {
    // 1. 区块的incex等于最后的一个区块index+1
    // 2. 区块的timestamp大于最后一个区块的
    // 3. 区块的prehash等于最后一个区块的hash
    //  4. 区块的hash难度符合要求
    if (
      newBlock.index !== lastBlock.index + 1 ||
      newBlock.timestamp <= lastBlock.timestamp ||
      newBlock.prevHash !== lastBlock.hash ||
      newBlock.hash.slice(0, this.diffcult) !== "0".repeat(this.diffcult) ||
      newBlock.hash !== this.computeHashForBlock(newBlock)
    ) {
      return false;
    }
    return true;
  }

  // 校验区块链
  isValidChain(chain = this.blockchain) {
    // 校验除创世区块外的区块
    for (let i = this.blockchain.length - 1; i >= 1; i = i - 1) {
      if (!this.isValidBlock(chain[i], chain[i - 1])) {
        return false;
      }
    }

    // 校验创世区块
    return JSON.stringify(chain[0]) === JSON.stringify(initBlock);
  }

  // 转账
  transfer(from, to, amount) {
    const timestamp = Date.now();
    const sig = rsa.sign({ from, to, amount, timestamp });
    const transObj = { from, to, amount, sig, timestamp };
    // 过滤奖励
    if ("0" !== from) {
      const balance = this.balance(from);
      if (balance < amount) {
        console.log("没有足够的余额可供转账", from, balance, amount);
        return;
      }
      this.boardcast({ type: "trans", data: transObj });
    }

    this.data.push(transObj);
    return transObj;
  }

  // 查看余额
  balance(address) {
    let blance = 0;
    this.blockchain.forEach(block => {
      if (!Array.isArray(block.data)) {
        return;
      }
      block.data.forEach(item => {
        if (address === item.from) {
          blance -= item.amount;
        } else if (address === item.to) {
          blance += item.amount;
        }
      });
    });
    return blance;
  }

  replaceChain(newChain) {
    if (newChain.length === 1) {
      return;
    }
    if (this.isValidChain(newChain) && newChain.length > this.blockchain.length) {
      this.blockchain = JSON.parse(JSON.stringify(newChain));
    } else {
      console.log(`[错误]:链不合法`);
    }
  }
  replaceTrans(newTrans) {
    if (newTrans.every(v => this.isValidTransfer(v))) {
      this.data = newTrans;
    }
  }
}

module.exports = Blockchain;
