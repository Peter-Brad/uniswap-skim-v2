

const path = 'https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2';

const fetchAccounts = async (nextBlock) => {
const pancakeswap_pairs_request = {
    query:
    `
    pairs(first: 1000, orderBy: block,where:{block_gt: "${nextBlock}"}) {
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
        hash
        block
        timestamp
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

const getPairs = async (pageCount, accountFirstSize) => {

    let firstPairCreateBlock = '';
    do {
        try {
            result = await fetchAccounts({
              lastid: lastid, 
              accountFirstSize: accountFirstSize
            });
        } catch (e) {
            console.log(e);
            continue;
        }

    }while();
}

