import "./App.css";
import pkg from "../package.json"
import { check } from "@tauri-apps/plugin-updater";
import {
    writeTextFile,
    mkdir,
    exists,
    readDir,
    readFile,
    remove,
    copyFile,
} from "@tauri-apps/plugin-fs";
import {appDataDir, basename, join} from "@tauri-apps/api/path";
import {useEffect, useState} from "react";

// Import custom assets
import xIcon from "./assets/icons/x-icon.png"
import backArrow from "./assets/icons/back-arrow-icon.png"
import devStashIcon from "./assets/icons/code-stash-icon.png"
import copyIcon from "./assets/icons/copy-icon.png"

function App() {

    async function checkForUpdates() {
        const update = await check();
        if (update?.available) {
            await update.downloadAndInstall();
        }
    }

    const DEFAULT_FILE_ICON = "📄";

    const [code, setCode] = useState("");
    const [fileName, setFileName] = useState("");
    const [dir, setDir] = useState(null);
    const [openFolders, setOpenFolders] = useState({});
    const [folderName, setFolderName] = useState("");
    const [allDirectories, setAllDirectories] = useState([])
    const [folderToSaveTo, setFolderToSaveTo] = useState('');
    const [fileExtension, setFileExtension] = useState('');
    const [view, setView] = useState('code');
    const [backedUpFiles, setBackedUpFiles] = useState([])
    const [copyText, setCopyText] = useState('Copy')

    const extensions = [
        ".txt", ".md", ".json", ".yaml", ".yml", ".toml", ".js", ".ts", ".jsx", ".tsx",
        ".html", ".css", ".scss", ".sass", ".java", ".py", ".rs", ".go", ".cpp", ".c", ".h",
        ".cs", ".php", ".rb", ".swift", ".kt", ".m", ".mm", ".scala", ".groovy", ".dart",
        ".lua", ".r", ".jl", ".hs", ".clj", ".fs", ".zig", ".nim", ".v", ".sv", ".glsl",
        ".hlsl", ".usf", ".shader", ".sh", ".bash", ".ps1", ".bat", ".cmd", ".env",
        ".ini", ".cfg", ".lock", ".xml", ".gradle", ".make", ".mk"
    ];

    const FILE_ICONS = {
        ".bash": "💻",
        ".bat": "🪟",
        ".c": "🔧",
        ".cfg": "⚙️",
        ".clj": "🔗",
        ".cmd": "🪟",
        ".cpp": "➕",
        ".cs": "🟣",
        ".css": "🎨",
        ".dart": "🎯",
        ".env": "🔐",
        ".fs": "🧮",
        ".glsl": "🎮",
        ".go": "🐹",
        ".gradle": "🐘",
        ".h": "📘",
        ".hlsl": "🎮",
        ".hs": "λ",
        ".html": "🌐",
        ".ini": "⚙️",
        ".java": "☕",
        ".jl": "📈",
        ".js": "🟨",
        ".json": "🧾",
        ".jsx": "⚛️",
        ".kt": "🤖",
        ".lock": "🔒",
        ".lua": "🌙",
        ".m": "📱",
        ".make": "🛠️",
        ".md": "📝",
        ".mk": "🛠️",
        ".mm": "📱",
        ".nim": "🧵",
        ".php": "🐘",
        ".ps1": "🪟",
        ".py": "🐍",
        ".r": "📊",
        ".rb": "💎",
        ".rs": "🦀",
        ".sass": "🎨",
        ".scala": "🧠",
        ".scss": "🎨",
        ".sh": "💻",
        ".shader": "🎮",
        ".sv": "🧪",
        ".swift": "🕊️",
        ".toml": "⚙️",
        ".ts": "🔷",
        ".tsx": "⚛️",
        ".txt": "📄",
        ".usf": "🎮",
        ".v": "🧪",
        ".xml": "🧾",
        ".yaml": "⚙️",
        ".yml": "⚙️",
        ".zig": "⚡"
    };

    // Retore a file that's been sent to the backup folder
    async function restore(file) {
        const baseDir = await ensureAppDir();
        // Grab the file name from the path
        const fileName = file.path.split("\\").pop();
        // Define the destination path
        const destPath = await join(baseDir, fileName);

        // Define the backup folder's path
        const backUpDir = await join(baseDir, "backup");
        // Get the file path from the backup folder
        const backUpFilePath = await join(backUpDir, fileName);

        // Copy the file from the backup folder to the destination path
        await copyFile(backUpFilePath, destPath);

        // Remove the file from the backup folder
        await remove(backUpFilePath);

        // Refresh the directory listing
        await listFoldersAndFiles()
        await listBackedUpFiles()
    }

    // Copies code to the clipboard
    function copyCode() {
        navigator.clipboard.writeText(code);
        setCopyText('Copied')
        setTimeout(() => setCopyText('Copy'), 2000)
    }

    // Matches the file extension to an icon
    function getFileIcon(fileName) {
        const dotIndex = fileName.lastIndexOf(".");
        if (dotIndex === -1) return DEFAULT_FILE_ICON;

        const ext = fileName.slice(dotIndex).toLowerCase();
        return FILE_ICONS[ext] ?? DEFAULT_FILE_ICON;
    }

    // Ensures the app directory exists
    async function ensureAppDir() {
        const dir = await appDataDir();

        const alreadyExists = await exists(dir);
        if (!alreadyExists) {
            await mkdir(dir, {recursive: true});
        }

        return dir;
    }

    // Lists all files and folders in the app directory
    async function listFoldersAndFiles() {
        const dir = await ensureAppDir();

        setDir(await readTree(dir))
    }

    // Reads the contents of a directory recursively
    async function readTree(dir) {
        const entries = await readDir(dir);
        const results = [];
        const folderResults = [];

        for (const entry of entries) {
            const fullPath = await join(dir, entry.name);

            // ⛔ Skip backup folder immediately
            if (entry.isDirectory && entry.name === "backup") {
                continue;
            }

            if (entry.isDirectory) {
                folderResults.push(entry);
                results.push({
                    ...entry,
                    path: fullPath,
                    children: await readTree(fullPath)
                });
            } else {
                results.push({
                    ...entry,
                    path: fullPath
                });
            }
        }

        console.log("folders:", folderResults)
        setAllDirectories(folderResults)

        return results;
    }

    // Saving new code
    async function saveCode() {

        const dir = await ensureAppDir();

        async function determineSave() {
            // If we're not just saving to the root, save to the folder specified
            if (folderToSaveTo !== 'Save to root') {
                return await join(dir, folderToSaveTo);
            } else {
                return dir
            }
        }

        const filePath = await join(await determineSave(), `${fileName}${fileExtension}`);

        await writeTextFile(filePath, String(code));

        // Clear the textarea
        setCode("");

        // Clear the fileName
        setFileName("");
        await listFoldersAndFiles()
    }

    // Creates a folder with the name specified in the input
    async function createFolder() {
        console.log("Creating folder", folderName);
        const base = await ensureAppDir();
        const path = await join(base, folderName);
        // If the folder already exists, do nothing
        if (await exists(path)) {
            console.log("Folder already exists");
            return;
        }
        console.log("Creating folder", path);
        await mkdir(path, {recursive: true});
        console.log("Folder created");
        // Clear the New Folder Input
        setFolderName("")
        listFoldersAndFiles()
    }

    // Reads all files in a directory recursively
    async function readAllFilesRecursive(dir) {
        const entries = await readDir(dir);
        const files = [];

        for (const entry of entries) {
            const path = await join(dir, entry.name);

            // ✅ ONLY read actual files
            if (entry.isFile === true) {
                const data = await readFile(path);
                const text = new TextDecoder("utf-8").decode(data);

                files.push({
                    name: entry.name,
                    path,
                    contents: text,
                });
            } else {
                // 👇 must be a directory → recurse
                files.push(...await readAllFilesRecursive(path));
            }
        }

        return files;
    }

    // Loads a single file from the app directory
    async function loadFile(fileName) {
        if (view !== 'code') setView('code')
        const dir = await ensureAppDir();
        const allFiles = await readAllFilesRecursive(dir);
        const fileToLoad = allFiles.find(f => f.name === fileName);
        setCode(fileToLoad.contents);
        setFileName(fileToLoad.name);
    }

    // Loads all files from the app directory
    async function loadAllFiles() {
        try {
            const dir = await ensureAppDir();
            return await readAllFilesRecursive(dir);
        } catch (e) {
            console.error("Failed to load files", e);
            return [];
        }
    }

    // Deletes a folder and everything in it
    async function removeFolder(path) {
        await remove(path, {recursive: true});
        await listFoldersAndFiles();
    }

    // Removes a single file and sends it to the backup folder
    async function removeFile(file) {
        setBackedUpFiles((prev) =>
            prev.filter((file) => file.path !== file.path)
        );

        // Write file to back-up folder
        const dir = await ensureAppDir();
        const backupDir = await join(dir, "backup");

        // If the back-up folder doesn't exist, create it'
        if (!(await exists(backupDir))) {
            await mkdir(backupDir, {recursive: true});

        }

        if (file.isDirectory) {
            console.log('This is a folder')
            return
        }

        const fileName = await basename(file.name)
        console.log('fileName:', fileName)
        const backupPath = await join(backupDir, fileName)

        // Copy before delete
        await copyFile(file.path, backupPath);

        // Remove original
        await remove(file.path);
        await showBackedUpFiles()
        await listFoldersAndFiles();
        return "File removed";
    }

    // Permanently deletes a file from the backup folder
    async function permRemoveFile(path) {
        await remove(path, {recursive: true});
        await showBackedUpFiles()
        return "File removed";
    }

    // Shows the files inside of a folder
    function toggleFolder(name) {
        setOpenFolders(prev => ({
            ...prev,
            [name]: !prev[name],
        }));
    }

    // Gets all the files in the backup folder
    async function showBackedUpFiles() {
        const dir = await ensureAppDir();
        const backupDir = await join(dir, "backup");
        if (!(await exists(backupDir))) {
            await mkdir(backupDir, {recursive: true});
        }
        const files = await readAllFilesRecursive(backupDir);
        setBackedUpFiles(files)
    }

    async function listBackedUpFiles() {
        const dir = await ensureAppDir();
        const backupDir = await join(dir, "backup");
        const files = await readAllFilesRecursive(backupDir);
        setBackedUpFiles(files)
        return files;
    }

    useEffect(() => {

        listFoldersAndFiles()

        loadAllFiles()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const run = async () => {
            await checkForUpdates()
        }

        run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="App">
            <div style={{height: "100vh", display: 'flex'}}>
                <div className={'menu'}>
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem'}}>
                            <img alt={''} src={devStashIcon} width={'50px'}/>
                            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'start'}}>
                                <h1 style={{margin: '0', fontWeight: '400'}}>CodeStash</h1>
                            </div>

                        </div>


                        <div>

                            <div className="inputWithButton" style={{marginBottom: '.5rem'}}>
                                <input
                                    className={'dark'}
                                    style={{border: '1px solid rgba(255,255,255,.2)'}}
                                    type="text"
                                    value={folderName}
                                    placeholder="Folder name"
                                    onChange={(e) => setFolderName(e.target.value)}
                                />
                                <button style={{
                                    color: 'white',
                                    borderLeft: '0',
                                    border: '1px solid rgba(255,255,255,.2)'
                                }} className={'dark-button'} onClick={createFolder}>Add
                                </button>
                            </div>

                            <div className={'scrollable'} style={{textAlign: "left", maxHeight: "70vh", zIndex: "0"}}>

                                {dir?.map((item, index) => (
                                    <div key={index}>
                                        {item.isDirectory ? (
                                            <>
                                                <div onClick={() => toggleFolder(item.name)}
                                                     className="fileListing"
                                                >
                                                    <div>
                                                        📁 {item.name}<br/>
                                                        {item.children?.length > 0 && (
                                                            <p
                                                                style={{
                                                                    paddingLeft: "1.7rem",
                                                                    fontSize: "12px",
                                                                    textAlign: "left"
                                                                }}
                                                            >
                                                                {item.children.length}{" "}
                                                                {item.children.length === 1 ? "file" : "files"}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <img
                                                        alt={''}
                                                        src={xIcon}
                                                        width="15"
                                                        className={"x-icon"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFolder(item.path);
                                                        }}
                                                    />

                                                </div>


                                                {openFolders[item.name] &&
                                                    item.children?.map((child, childIndex) => (
                                                        <div
                                                            onClick={() => loadFile(child.name)}
                                                            className="fileListing"
                                                            style={{
                                                                marginLeft: "1rem",
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center"
                                                            }}
                                                            key={childIndex}>
                                                            <p

                                                            >
                                                                {getFileIcon(child.name)} {child.name}
                                                            </p>
                                                            <img
                                                                alt={''}
                                                                src={xIcon}
                                                                width="15"
                                                                className={"x-icon"}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFile(child);
                                                                }}
                                                            />
                                                        </div>
                                                    ))
                                                }
                                            </>
                                        ) : (
                                            <div
                                                onClick={() => loadFile(item.name)}
                                                className="fileListing"
                                                style={{
                                                    position: "relative",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <p
                                                    style={{paddingRight: '.75rem', textAlign: 'left'}}
                                                >
                                                    {getFileIcon(item.name)} {item.name}
                                                </p>

                                                <img
                                                    alt={''}
                                                    src={xIcon}
                                                    width="15"
                                                    className={"x-icon"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(item);
                                                    }}
                                                />


                                            </div>

                                        )}
                                    </div>
                                ))}


                            </div>
                        </div>
                    </div>

                    <div style={{
                        justifyContent: 'left',
                        display: 'flex',
                        gap: '1rem',
                        flexDirection: 'column',
                        textAlign: 'left'
                    }}>
                        <p onClick={() => {
                            showBackedUpFiles()
                            setView('recover')
                        }} style={{
                            textAlign: 'left',
                            color: 'rgba(255,255,255,.5)',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}>Recover Deleted Files</p>

                        <div style={{display: 'flex', justifyContent: 'start', alignItems: 'center', gap: '.5rem'}}>
                            {/*<img style={{opacity: '20%'}} src={masonCodeIcon} width={'40px'}/>*/}
                            <p className={'faint-text text-left'}>Version {pkg.version}</p>
                        </div>

                    </div>


                </div>
                {view === 'code' &&
                    <div className={'body gap1'}>


                  <textarea className={'code-input scrollable'}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={"Paste Code Here"}
                            style={{height: '50%'}}
                  ></textarea>

                        <div className={'grid-2-col'}
                             style={{height: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'}}>

                            <div className={'span-2-col'} style={{color: 'white', textAlign: 'left'}}>

                                <div onClick={copyCode} className={'flex gap-quarter mb-1'} style={{alignItems: 'center', cursor: 'pointer'}}>
                                    <img alt={''} src={copyIcon} width={'20px'} onClick={copyCode}/>
                                    <p value={copyText} style={{fontSize: '14px'}}>{copyText}</p>
                                </div>

                                <p className={'text-left mb-quarter'}>Name your code</p>
                                <div className={'inputWithDropdown mb-1'}>
                                    <input className={'input'} value={fileName}
                                           onChange={(e) => {
                                               console.log(e.target.value)
                                               setFileName(e.target.value)
                                           }}
                                           placeholder={'Name'}/>

                                    <select
                                            value={fileExtension}
                                            onChange={(e) => {
                                                console.log(e.target.value)
                                                setFileExtension(e.target.value)
                                            }}
                                    >
                                        <option value="">.txt</option>
                                        {extensions.sort().map(ext => (
                                            <option key={ext}>{ext}</option>
                                        ))}

                                    </select>
                                </div>
                                <p className={'text-white text-left mb-quarter'}>Location</p>
                                <select className={'text-white select text-left dark'}
                                        style={{border: '1px solid rgba(255,255,255,.2)'}}
                                        value={folderToSaveTo}
                                        onChange={(e) => setFolderToSaveTo(e.target.value)}>
                                    <option className={'text-left'} value="">Save to root</option>
                                    {allDirectories?.map((folder, index) => (
                                        <option style={{marginRight: '.5rem'}} className={'text-left'}
                                                value={folder.name}
                                                key={index}>{folder.name}  </option>
                                    ))}
                                </select>


                            </div>
                            <div style={{justifyContent: 'flex-start', display: 'flex', gap: '1rem'}}>
                                <button className={'button'} onClick={saveCode}>Save</button>
                                {/*<button onClick={loadAllFiles}>Refresh</button>*/}
                            </div>
                            <div>

                            </div>

                        </div>

                        {/*<button onClick={callGreet}>Call Rust</button>*/}

                    </div>
                }

                {view === 'recover' &&
                    <div className={'body'}>
                        <div style={{
                            textAlign: 'left',
                            color: 'white',
                            display: 'flex',
                            gap: '.5rem',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }} onClick={() => setView('code')}><img alt={''} src={backArrow} width={"15px"}/><p
                            style={{fontSize: '1rem'}}>Back</p></div>
                        <div className={'scrollable'} style={{marginTop: '1rem'}}>
                            {backedUpFiles.length > 0 ? (
                                backedUpFiles.map((file, index) => (
                                    <div
                                        className="fileListing"
                                        key={index}
                                        style={{display: "flex", gap: "1rem", alignItems: "center"}}
                                    >
                                        <p style={{color: "white"}}>{file.name}</p>

                                        <div className="flex gap1 text-white child-hover-underline">
                                            <p onClick={() => restore(file)}>Restore</p>
                                            <p onClick={() => permRemoveFile(file.path)}>Delete</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <h3 className={'text-light'}>No files to show</h3>
                            )}

                        </div>
                    </div>
                }

            </div>

        </div>
    )
        ;
}

export default App;
