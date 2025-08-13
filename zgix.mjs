import path from "path" 
import fs from 'fs/promises';
import crypto from "crypto"
class Zgix{
    constructor(repoPath="."){
        this.repoPath =path.join(repoPath, ".zgix");//this will create the .zgix directory in the specified repoPath
        this.objectsPath = path.join(this.repoPath, "objects"); //this will create the objects directory in the .zgix directory *** this is for the hashed content
        this.headPath = path.join(this.repoPath, "HEAD"); //this will create the HEAD file in the .zgix directory*** this is for keeping track of the head
        this.indexPath = path.join(this.repoPath, "index"); //this will create the index file in the .zgix directory*** this is for the staging area
        this.init();
    }

    async init(){
        await fs.mkdir(this.objectsPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, "",{flag: 'wx'}); //wx: open for writing , fail if file exists
            await fs.writeFile(this.indexPath, JSON.stringify([]),{flag: 'wx'}); //wx: open for writing , fail if file exists
        } catch (error) {
            console.error("Error initializing zgix:", error);
        }   
    }

    hasObject(content){
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded){
        const fileData=await fs.readFile(fileToBeAdded, "utf-8");
        console.log("File Data:", fileData);
        const fileHash=this.hasObject(fileData);
        console.log("File Hash:", fileHash);
        const objectsDirPath=path.join(this.objectsPath, fileHash.slice(0, 2));
        const objectsFilePath=path.join(objectsDirPath, fileHash.slice(2));
        await fs.mkdir(objectsDirPath, { recursive: true });
        await fs.writeFile(objectsFilePath, fileData);
        //TODO: missing step : add the file to staging area
        console.log(`Added file to zgix: ${fileToBeAdded}`);
    }

}

const zgix=new Zgix();
zgix.add("sample.txt");
