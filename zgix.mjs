#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { diffLines } from "diff";
import chalk from "chalk";
import { jsonrepair } from "jsonrepair";
// import {Command} from 'commander'

// const program = new Command();
class Zgix {
  constructor(repoPath = ".") {
    this.repoPath = path.join(repoPath, ".zgix"); //this will create the .zgix directory in the specified repoPath
    this.objectsPath = path.join(this.repoPath, "objects"); //this will create the objects directory in the .zgix directory *** this is for the hashed content
    this.headPath = path.join(this.repoPath, "HEAD"); //this will create the HEAD file in the .zgix directory*** this is for keeping track of the head
    this.indexPath = path.join(this.repoPath, "index"); //this will create the index file in the .zgix directory*** this is for the staging area
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.objectsPath, { recursive: true });
      await fs.writeFile(this.headPath, "", { flag: "wx" }); //wx: open for writing , fail if file exists
      await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: "wx" }); //wx: open for writing , fail if file exists
    } catch (error) {
      // console.error("zgix already exist");
    }
  }

  // Hash the content of a file
  hasObject(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  async add(fileToBeAdded) {
    try {
      const fileData = await fs.readFile(fileToBeAdded, "utf-8");
      const fileHash = this.hasObject(fileData);
      const objectsDirPath = path.join(this.objectsPath, fileHash.slice(0, 2));
      await fs.mkdir(objectsDirPath, { recursive: true });
      const objectsFilePath = path.join(objectsDirPath, fileHash.slice(2));
      await fs.writeFile(objectsFilePath, fileData);
      await this.updatingStagingArea(fileToBeAdded, fileHash);
      // console.log(`Added file to zgix: ${fileToBeAdded}`);
    } catch (err) {
      console.error("Error adding file to zgix:", err);
    }
  }

  //adding the staging area inside index file
  async updatingStagingArea(filePath, fileHash) {
    try {
      const index = JSON.parse(
        await fs.readFile(this.indexPath, { encoding: "utf-8" })
      );
      index.push({ path: filePath, hash: fileHash });
      await fs.writeFile(this.indexPath, JSON.stringify(index));
    } catch (err) {
      console.error("Error updating staging area:", err);
    }
  }

  async commit(message) {
    try {
      const index = JSON.parse(
        await fs.readFile(this.indexPath, { encoding: "utf-8" })
      );
      const parentCommit = await this.getCurrentHead();
      const commitData = {
        message,
        author: "User",
        timeStamp: new Date().toISOString(),
        files: index,
        parent: parentCommit,
      };
      const commitHash = this.hasObject(JSON.stringify(commitData));
      const commitDirPath = path.join(this.objectsPath, commitHash.slice(0, 2));
      await fs.mkdir(commitDirPath, { recursive: true });
      const commitFilePath = path.join(commitDirPath, commitHash.slice(2));
      await fs.writeFile(commitFilePath, JSON.stringify(commitData));
      await fs.writeFile(this.headPath, commitHash); // update the head to point to the new commit
      await fs.writeFile(this.indexPath, JSON.stringify([])); //clear the staging area
      // console.log(`Commit created: ${commitHash}`);
    } catch (err) {
      console.error("Error committing changes:", err);
    }
  }

  async getCurrentHead() {
    try {
      const head = await fs.readFile(this.headPath, { encoding: "utf-8" });
      return head.trim();
    } catch (err) {
      return null; // If HEAD file empty, return null
    }
  }

  async log() {
    let currentCommitHash = await this.getCurrentHead();
    let isHead = true;
    while (currentCommitHash) {
      // const commitDirPath = path.join(
      //   this.objectsPath,
      //   currentCommitHash.slice(0, 2)
      // );
      // const commitFilePath = path.join(
      //   commitDirPath,
      //   currentCommitHash.slice(2)
      // );
      // const commitData = JSON.parse(
      //   await fs.readFile(commitFilePath, { encoding: "utf-8" })
      // );
      const commitData = await this.getCommitData(currentCommitHash);
      console.log(
        `\x1b[33mcommit ${currentCommitHash}\x1b[0m` +
          (isHead ? `\x1b[32m (HEAD)\x1b[0m` : "")
      );
      console.log(`\x1b[34mAuthor:\x1b[0m ${commitData.author}`);
      console.log(`\x1b[35mDate:\x1b[0m   ${commitData.timeStamp}\n`);
      console.log(`    ${commitData.message}\n`);

      if (commitData.parent) {
        console.log(
          "\x1b[90m------------------------------------------------------------\x1b[0m\n"
        );
      }

      isHead = false;
      currentCommitHash = commitData.parent;
    }
  }

  async showCommitDiff(commitHash) {
    try {
      const commitData = commitHash
        ? await this.getCommitData(commitHash)
        : undefined;
      if (!commitData) {
        console.log(chalk.red("commit not found"));
        return;
      }
      console.log("changes in the last commit are: ");
      for (const file of commitData.files) {
        console.log(`File: ${file.path}`);
        const fileContent = await this.getFileContent(file.hash);
        console.log(`Content: ${fileContent}\n`);
        if (commitData.parent) {
          //get the parent commit data
          const parentCommitData = await this.getCommitData(commitData.parent);
          if (!parentCommitData) {
            console.log("Parent commit not found (corrupt history?)");
            continue; // skip diff for this file
          }
          const parentFileContent = await this.getParentFileContent(
            parentCommitData,
            file.path
          );
          if (parentFileContent) {
            console.log(`\nDiff: ${parentFileContent}\n`);
            const diff = diffLines(
              JSON.stringify(parentFileContent, null, 2),
              JSON.stringify(fileContent, null, 2)
            );
            // console.log(diff);
            diff.forEach((part) => {
              if (part.added) {
                process.stdout.write(chalk.green("+++", part.value));
              } else if (part.removed) {
                process.stdout.write(chalk.red("---", part.value));
              } else {
                process.stdout.write(chalk.grey(part.value));
              }
            });
            console.log();
          } else {
            console.log("this file is a new file in this commit");
          }
        } else {
          console.log("first commit");
        }
        // Check for deleted files (exist in parent but not in current commit)
        if (commitData.parent) {
          const parentCommitData = await this.getCommitData(commitData.parent);
          if (parentCommitData) {
            const deletedFiles = parentCommitData.files.filter(
              (pFile) => !commitData.files.some((f) => f.path === pFile.path)
            );

            for (const file of deletedFiles) {
              console.log(`Deleted file: ${file.path}`);
              const oldContent = await this.getFileContent(file.hash);
              console.log(
                chalk.red(
                  `\nRemoved content:\n${JSON.stringify(oldContent, null, 2)}\n`
                )
              );
            }
          }
        }
      }
    } catch (err) {
      console.log(chalk.red("commit not found"));
    }
  }

  async getCommitData(commitHash) {
    try {
      const commitDirPath = path.join(this.objectsPath, commitHash.slice(0, 2));
      const commitFilePath = path.join(commitDirPath, commitHash.slice(2));
      return JSON.parse(
        await fs.readFile(commitFilePath, { encoding: "utf-8" })
      );
    } catch (err) {
      console.error(chalk.red("not a valid commit hash"));
      return null;
    }
  }

  async getFileContent(fileHash) {
    const fileDirPath = path.join(this.objectsPath, fileHash.slice(0, 2));
    const filePath = path.join(fileDirPath, fileHash.slice(2));
    try {
      const rawContent = await fs.readFile(filePath, { encoding: "utf-8" });
      try {
        return JSON.parse(jsonrepair(rawContent));
      } catch {
        return rawContent; // fallback to plain text
      }
    } catch (err) {
      console.error("Error getting file content:", err);
      return null;
    }
  }

  async getParentFileContent(parentCommitData, filePath) {
    const parentFile = parentCommitData.files.find(
      (file) => file.path === filePath
    );
    if (parentFile) {
      return await this.getFileContent(parentFile.hash);
    }
    return null; // If the file doesn't exist in the parent commit
  }

  async checkout(commitHash, filePath) {
    const commitData = await this.getCommitData(commitHash);
    if (!commitData) {
      console.log(chalk.red("unable to checkout: commit not found"));
      return;
    }
    const checkoutData = commitData.files.find(
      (file) => file.path === filePath
    );
    if (!checkoutData) {
      console.log(chalk.red("unable to checkout: file not found"));
      return;
    }
    const fileContent = await this.getFileContent(checkoutData.hash);
    console.log(chalk.green(`Checking out file: ${filePath}`));
    console.log(chalk.yellow(`Commit: ${commitHash}`));
    console.log(chalk.grey(`File content:\n${fileContent}`));
    try {
      await fs.writeFile(filePath, fileContent);
    } catch (err) {
      console.error(chalk.red("Error checking out file:"), err);
    }
  }
}

(async () => {
  const zgix = new Zgix();
  // await zgix.add("sample.txt");
  // await zgix.commit("5th commit");
  // await zgix.log();
  // await zgix.checkout("aa4ce8418dd4bbe2166d6a182006d0070648c015", "sample.txt");
})();

// ----------------- CLI -----------------
const args = process.argv.slice(2);
const cmd = args[0];
const zgix = new Zgix();

switch (cmd) {
  case "init":
    await zgix.init();
    break;
  case "add":
    await zgix.add(args[1]);
    break;
  case "commit":
    const msgIndex = args.indexOf("-m");
    const message = msgIndex !== -1 ? args[msgIndex + 1] : "no message";
    await zgix.commit(message);
    break;
  case "log":
    await zgix.log();
    break;
  case "diff":
    await zgix.showCommitDiff(args[1]);
    break;
  case "checkout":
    await zgix.checkout(args[1], args[2]);
    break;
  default:
    console.log(
      chalk.red("Unknown command. Available: init, add, commit, log, diff")
    );
}
