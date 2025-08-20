# Zgix

Zgix is a lightweight Git-like version control system built with Node.js. It allows you to track file changes, create commits, view commit history, and see diffs between commits, all using a simple command-line interface (CLI).

---

## Features

- Initialize a Zgix repository (`init`)
- Stage files for commit (`add`)
- Commit staged changes (`commit`)
- View commit history (`log`)
- View differences between commits (`diff`)

---

## Installation

1. Clone the repository or copy the files into your project.
2. Ensure you have Node.js installed (v14+ recommended).
3. Make the CLI executable (optional):

```bash
//linux or macos
yarn install

//windows
npm install
```

## USAGE

```bash
//linux or macos
chmod +x zgix.js

//windows
node zgix.js <command>
```

# Initialize a repository
```bash
node zgix.js init
```

# Add files to staging
```bash
node zgix.js add <file_path>

# Example: Add file
node zgix.js add sample.txt
```

# Commit changes
```bash
node zgix.js commit -m "Commit message"

# Example: commit
node zgix.js commit -m "Initial commit"
```
# View commit history
```bash
node zgix.js log

# Example: log
commit be556ff95b21f5af0a5c180bf49c118f60808689 (HEAD)
Author: User
Date:   2025-08-19T12:34:56.789Z

    Initial commit
------------------------------------------------------------
commit f2b8e7d6c4a1b9e88a7d7d9f8b2e8f5b6a7e8c9d
Author: User
Date:   2025-08-18T10:12:45.123Z

    Added sample.txt
```
# View changes in a commit
```bash
node zgix.js diff <commit_hash>

#Example: Diff <commit-hash>
node zgix.js diff be556ff95b21f5af0a5c180bf49c118f60808689
```
# Checkout  a commit
```bash
node zgix.js checkout <commit_hash> <file_path>

#Example: Diff <commit-hash>
node zgix.js checkout be556ff95b21f5af0a5c180bf49c118f60808689 sample.txt
```

# View changes in the last commit
```bash
.zgix/
├── objects/       # Stores all file contents and commits
├── HEAD           # Points to latest commit
└── index          # Staging area
```

