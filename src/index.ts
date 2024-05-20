import {initServer} from "./app/index"
const PORT = 8000;

 async function init(){
    const httpServer = await initServer()
    httpServer.listen(8000, ()=> console.log(`❄️  Server is running at PORT:${PORT} ❄️`))
 }

 init();