console.time('runtime-skimmer');

const Web3 = require('web3');
const util = require('util');
const fs = require('fs');
const env = require('dotenv').config();
const path = require('path');

const pairCounts = require('../../data/factories/pair-counts.js');
const baseToken = require('../../data/tokens/baseToken.js');

const setRPC = async (chain) => {
    try {
      let rpc;
  
      if (chain === 'eth') {
        rpc = env.parsed.ETHEREUM_RPC;
      } else if (chain === 'bsc') {
        rpc = env.parsed.BSC_RPC;
      } else if (chain === 'matic') {
        rpc = env.parsed.MATIC_RPC;
      } else if (chain === 'ftm') {
        rpc = env.parsed.FANTOM_PRC;
      } else if (chain === 'xdai') {
        rpc = env.parsed.XDAI_RPC;
      } else if (chain === 'heco') {
        rpc = env.parsed.HECO_RPC;
      } else if (chain === 'arbi') {
        rpc = env.parsed.ARBITRUM_RPC;
      } else if (chain === 'bscTest') {
        rpc = env.parsed.BSC_RPC_TEST;
      }
  
      web3 = new Web3(rpc);
      return;
    } catch (e) {
      console.log(`error on setRPC: ${e}`);
    }
};

//检查pair中是否包含baseToken && 当前pair的单边价值超过阈值
const pairValid = (network, dexPair) => {
    let returnObj = new Object();
    returnObj.index = -1;
    try{
    for(let i = 0; i < baseToken[`${network}`].length; i++){
        //console.log(baseToken[`${network}`][i]);
        //字符串的大小比较怎么弄？
        //转换为BigInt
        if( (dexPair.token0.symbol === baseToken[`${network}`][i].symbol && BigInt(dexPair.token0.reserve) > BigInt(baseToken[`${network}`][i].least) ) ){
          returnObj.index = 0;
          returnObj.least = baseToken[`${network}`][i].least;
          return returnObj;
  
        }
        if ((dexPair.token1.symbol === baseToken[`${network}`][i].symbol && BigInt(dexPair.token1.reserve) > BigInt(baseToken[`${network}`][i].least) ) ) {
          returnObj.index = 1;
          returnObj.least = baseToken[`${network}`][i].least;
          return returnObj;
        }
    }
    } catch (e) {
      console.log(`error on pairValid: ${e}`);
    }  
  
    return returnObj;
}

const otherDexes = (network, baseDex) => {
    //确定参与搜索的dex的数量
    let dexCount = 0;
    let dexArray = new Array();
    for (let i = 0; i < pairCounts.length; i++) {
      //console.log(pairCounts[i].network)
      if (network === pairCounts[i].network && pairCounts[i].name != baseDex) {
        dexCount++;
        dexArray.push(pairCounts[i].name);
      }
    }
    //console.log(dexArray);
    //dexArray = new Array();
    //dexArray.push('bi');
    return dexArray;
}


//从其他dex中找到相同的pair
const findSamePair = (network, dexArray, pairName, tokenIndex, least) => {
  let pairsInfo = new Array();
  try {
    for(let q = 0; q < dexArray.length; q++){
        let dex2Path = path.resolve(
          '../uniswap-skim-v2/data/pairs/',
          `${network}`,
          `${dexArray[q]}.js`
        );
        let dex2data = require(dex2Path);
        let dex2MapPath = path.resolve(
            '../uniswap-skim-v2/data/pairs/',
            `${network}`,
            `${dexArray[q]}-map.js`
          );
        let dex2dataMap = require(dex2MapPath);
        if( pairName in dex2dataMap){
            
            // or dex2dataMap.hasOwnProperty(pairName)
            let index =   dex2dataMap[pairName];
            let obj = new Object();
            obj.dex = dexArray[q];
            obj.address = dex2data[index].id;
            if(tokenIndex == 0){
              obj.oneSideValue = dex2data[index].token0.reserve
            }else{
              obj.oneSideValue = dex2data[index].token1.reserve
            }
            // 根据baseToken的最低资金限制进行筛选
            console.log(obj.oneSideValue );
            if( BigInt(obj.oneSideValue) > BigInt(least) ){
               pairsInfo.push(obj);
            }
        }
    }
  } catch (e) {
    console.log(`error on findSamePair: ${e}`);
  }
  console.log(pairsInfo);

  return pairsInfo;
}

//写入CrossDexesPairs/bsc/pairs.js
const writeFinalObj = (network, baseDex, finalObj) => {
    let pairsPath = path.resolve(
        '../uniswap-skim-v2/data/CrossDexesPairs/',
        `${network}`,
        `${baseDex}.js`
    );
    let formatted = util.inspect(finalObj, {
      compact: false,
      depth: 3,
      breakLength: 80,
      maxArrayLength: null,
    });
    //
    //清空文件 写入新内容
    fs.writeFile(pairsPath, `module.exports = ${formatted}`, 'utf-8', (e) => {
        if (e) {
          console.log(`error on writeFinalObj: ${e}`);
          return;
        }
    });
}

const getNowDate = () => {
    const date = new Date();
    let month  = date.getMonth() + 1;
    let strDate = date.getDate();
   
    if (month <= 9) {
      month = "0" + month;
    }
   
    if (strDate <= 9) {
      strDate = "0" + strDate;
    }
   
    return date.getFullYear() + "-" + month + "-" + strDate + " "
    + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

//生成dex-pair-map文件,便于对比分析
const prepare = (network, baseDex) => {
     let dexArray = otherDexes(network, baseDex);
     dexArray.push(baseDex);

    for(let m = 0; m < dexArray.length; m++){
      let dex2Path = path.resolve(
        '../uniswap-skim-v2/data/pairs/',
        `${network}`,
        `${dexArray[m]}.js`
      );
      let dex2data = require(dex2Path);

      let dex2MapPath = path.resolve(
        '../uniswap-skim-v2/data/pairs/',
        `${network}`,
        `${dexArray[m]}-map.js`
      );

      let finalObj = new Object();
      for(let n = 0; n < dex2data.length; n++){
        //finalObj[ dex2data[n].pairName ] = dex2data[n].index;
        finalObj[ dex2data[n].pairName ] = n;
      }

      let formatted = util.inspect(finalObj, {
        compact: false,
        depth: 2,
        breakLength: 80,
        maxArrayLength: null,
      });

      fs.writeFile(dex2MapPath, `module.exports = ${formatted}`, 'utf-8', (e) => {
        if (e) {
          console.log(`error on updatePairCount: ${e}`);
          return;
        }
      });
    }
}

  
  // 筛选出与主流币种配对的pair，且主流币的总价值要在1w以上？
  // BSC链上的主流币种包括 BNB USDC USDT ETH BTC .
  // 输出pair地址，对应的币的名称，币的数量，币的价格，币的总价值，查询时间，保存到文件吧先，后续考虑到数据库
  
  // 后续优化需求
  // 每个币对中的各个pair增加state（valid，invalid），同时增加update操作，可以根据单边币的价值，更新state
  // 
  const filter = (network, baseDex) => {
    let finalObj = new Object();

    let dexArray = otherDexes(network, baseDex);
    let dexPath = path.resolve(
      '../uniswap-skim-v2/data/pairs/',
      `${network}`,
      `${baseDex}.js`
    );
    let dexdata = require(dexPath);
    //从baseDex中的有baseToken的pair开始便利
    for(let j = 0; j < dexdata.length; j++){
      //console.log(dexdata[j]);
      //检查pair中是否包含baseToken && 当前pair的单边价值超过1w
      let returnObj = pairValid(network, dexdata[j]);
      //pair中没有基础token，跳过
      if(returnObj.index == -1){
        continue;
      }
      console.log(" ")
      console.log(returnObj);
      console.log(dexdata[j].pairName + ", " + dexdata[j].id);
      
      let pairName = dexdata[j].pairName;
      let pairsInfo = findSamePair(network, dexArray, pairName, returnObj.index, returnObj.least);

      if(pairsInfo.length == 0)
      {
          continue;
      }
      // 将当前baseDex的信息填充进去
      let obj = new Object();
      obj.dex = baseDex;
      obj.address = dexdata[j].id;
      if(returnObj.index == 0){
        obj.oneSideValue = dexdata[j].token0.reserve
      }else{
        obj.oneSideValue = dexdata[j].token1.reserve
      }
      pairsInfo.unshift(obj);

      let tokenPairObj = new Object();
      tokenPairObj['lastUpdated'] = getNowDate();
      tokenPairObj['dexes'] = pairsInfo;

      tokenPairObj['token0Address'] = dexdata[j].token0.id;
      tokenPairObj['token1Address'] = dexdata[j].token1.id;

      tokenPairObj['token0Symbol'] = dexdata[j].token0.symbol;
      tokenPairObj['token1Symbol'] = dexdata[j].token1.symbol;

      finalObj[pairName] = tokenPairObj;
    }

    writeFinalObj(network, baseDex, finalObj);
     
};


// yarn run find-cross-pairs $network $basedex 
const handleInput = async () => {
    try {
        if (process.argv.length === 4) {
            // process.argv[0] run
            // process.argv[1] find-cross-pairs
            // process.argv[2] $network
            // process.argv[3] $basedex
            //await setRPC(factoryPair.network);

            filter(process.argv[2], process.argv[3]);
        }else if(process.argv.length === 5){
            // process.argv[0] run
            // process.argv[1] find-cross-pairs
            // process.argv[2] $network
            // process.argv[3] $basedex
            // process.argv[4] prepare
            prepare(process.argv[2], process.argv[3]);
        }
    } catch (e) {
        console.log(`error on handleInput: ${e}`);
    }
}

handleInput();