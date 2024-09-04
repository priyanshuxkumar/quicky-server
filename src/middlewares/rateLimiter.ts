const BUCKET_CAPACITY = 10;
const LEAK_RATE = 1000;

interface LeakyBucket {
  requests: number[];
  addRequest: (requestId: number) => boolean;
  processRequest: () => boolean;
}

let leakyBucket: LeakyBucket = {
  requests: [],
  addRequest: function (requestId: number): boolean {
    if (this.requests.length < BUCKET_CAPACITY) {
      this.requests.push(requestId);
      console.log(`✅ Request ${requestId} added`);
      return true;
    } else {
      console.log(`❌ Request ${requestId} rejected`);
      return false;
    }
  },
  processRequest: function () {
    if (this.requests.length > 0) {
      const requestId = this.requests.shift();
      console.log(`Processing ${requestId} Request`);
      return true;
    }
    return false;
  },
};

function handleIncomingRequests(requestId: number) {
  if (!leakyBucket.addRequest(requestId)) {
    console.log("Request could not be processed. Please try again");
  }
  return true;
}

setInterval(() => {
  leakyBucket.processRequest();
}, LEAK_RATE);


export {handleIncomingRequests}