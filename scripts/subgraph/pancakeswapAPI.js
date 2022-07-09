const nfetch = require('node-fetch');

// 循环访问subgraph，并将数据保存起来的类，预感后面还会经常用到
// 

const path = 'https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2';

const fetchPairs = async (nextBlock) => {
// 
const pancakeswap_pairs_request = {
    query:
    `
    {
      pairs(first: 10, orderBy: block,where:{block_gt: ${nextBlock}}) {
        id
        name
        token0 {
          id
          name
          symbol
          decimals
        }
        token1 {
          id
          name
          symbol
          decimals
        }
        block
        reserve0
        reserve1
        timestamp
      }
    }
    `
}

const response = await nfetch(path, {
    method: 'post',
    body: JSON.stringify(pancakeswap_pairs_request),
    headers: {'Content-Type': 'application/json'}
  });
  //console.log(response);
  const data = await response.json()
  return data
}

async function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}

const getPairs = async (pageCount) => {
    
    //let  firstPairCreateBlock = new Number(8857083)
    let  firstPairCreateBlock = 8857083
    let i = 1;
    let result;
    do {
        try {
            result = await fetchPairs(
              firstPairCreateBlock
            );
        } catch (e) {
            console.log(e);
            continue;
        }
        if (result.error) {
          console.warn(result.error.toString());
          continue;
        }
        //console.log(result);
        console.log("result.data.pairs: " + result.data.pairs.length);
        console.log(result.data.pairs[0]);
        i++;
        //获取最后一条的block数据
        await sleep(200); // Avoid rate limiting
    }while(result.data.pairs.length == 1000 && i <= pageCount);

    //存入文件
    
}

getPairs(1);


