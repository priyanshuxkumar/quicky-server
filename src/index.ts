import {initServer} from "./app/index"


 async function init(){
    const httpServer = await initServer()
    
    httpServer.listen(process.env.PORT,() => console.log(`❄️  Server is running at PORT:${process.env.PORT} ❄️`));
 }

 init();