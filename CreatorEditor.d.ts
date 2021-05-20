/**
 * @author Billiy
 * @description creator编辑器头文件，因为开放的文档较少，我能写的也就不多
 * 2019/10/17
 */
declare namespace Editor {
    /** MAIN PROCESS */
    export const argv:number;
    export const dev:string;
    export const frameworkPath:string;
    export const isClosing:boolean;
    export const lang:string;
    export const logfile:string;
    export const versions:string;

    export function init(opts:{i18n?:any[],layout?:string,'main-menu'?:Function,profile?:object})
    export function run(url:string,opts:object);
    export function reset();
    export function loadPackagesAt(path:string,callback:Function);
    export function loadAllPackages(callback:Function);
    export function require(url:string);
    export function url(url:string);
    export function watchPackages(callback:Function);

    /** Console Module */
    export function clearLog(pattern:string,useRegex:boolean);
    export function connectToConsole();
    export function fatal(...args:any[]);
    
    export class App {
        static focused:boolean;
        static home:string;
        static name:string;
        static path:string;
        static version:string;
        static emit(eventName:string,...arg: any);
        static extends(proto:object);
        static off(eventName:string,listener:Function);
        static on(eventName:string,listener:Function);
        static once(eventName:string,listener:Function);
    }

    export class Debugger {
        static debugPort:string;
        static isNodeInspectorEnabled:boolean;
        static isReplEnabled:boolean;
        static activeDevtron();
        static toggleNodeInspector();
        static toggleRepl();
        static startNodeInspector();
        static startRepl();
        static stopNodeInspector();
        static stopRepl();
    }

    export class DevTools {
        static focus(editorWin:Editor.Window);
        static executeJavaScript(editorWin:Editor.Window,script:string);
        static enterInspectElementMode(editorWin:Editor.Window);
    }

    export class Profile {
        static load(name:string,defaultProfile:object);
        static register(type:string,path:string);
        static reset();
    }

    export class Worker {
        constructor(name:string,options?:{workerType:'renderer'|'main',url:string});
        close();
        dispose();
        on(message:string,...args: any[]);
        start(argb:object,cb:Function);
    }

    /** RENDERER PROCESS (WEB PAGE) */
    export function log(msg: string|any, ...subst: any[]): void;
    export function info(msg: string|any, ...subst: any[]): void;
    export function warn(msg: any, ...subst: any[]): void;	
    export function error(msg: any, ...subst: any[]): void;	

    export function trace(level?:string, ...args: any[]): void;
    export function success(...args: any[]): void;
    export function failed(...args: any[]): void;

    /**
     * Returns the file path (if it is registered in custom protocol) or url (if it is a known public protocol).
     * @param url 
     */
    export function url(url:string): string;
    /**
     * 
     * @param url 
     * @param cb 
     */
    export function loadProfile(url:string,cb?:Function): void;
    // export function import(urls:string|string[]);
    
    export class Dialog {
        static openFile(...args: any[]): void;
        static savaFile(...args: any[]): void;
        static messageBox(...args: any[]): void;
    };

    export class Ipc {
        static cancelRequest(sessionID:string): void;
        static option(opts:{excludeSelf:boolean} | object): void;
        static sendToAll(message:string,...args: any[],option?:object): void;
        static sendToMain(message:string,...args: any[],callback?:Function,timeout?:number): void;
        static sendToMainWin(message:string,...args: any[]): void;
        static sendToPackage(pgkName:string,message:string,...args: any[]):void;
        static sendToPanel(panelID:string,message:string,...args: any[],callback?:Function,timeout?:number);
        static sendToWins(message:string,...args: any[],option?:object)
    };

    export class MainMenu {
        static apply(): void;
        static add(path:string,template:array|object): void;
        static init(): void;
        static remove(path:string): void;
        static set(path:string,options:object | {icon:any,enabled:boolean,visible:boolean,checked:boolean}): void;
        static update(path:string,template:array|object): void;
    }

    export class Menu {
        constructor(template:array|object,webContents?:{path?:string,message?:string,command?:string,params?:any[],panel?:string,dev?:string});
        add(path:string,template:array|object);
        clear();
        dispose();
        insert(path:string,pos:number,template:array|object);
        remove(path:string);
        reset(template:array|object);
        set(path:string,options?:{icon?:any,enabled?:boolean,visible?:boolean,checked?:boolean})
        update(path:string,template:array|object);

        static showDev:boolean;
        static convert(template:array|object,webContents:object);
        static getMenu(name:string);
        static register(name:string,fn:Function,force:boolean);
        static unregister(name:string);

        /** renderer process */
        popup(template:{x:number,y:number}): void;
        register(name:string,tmpl:object,force?:boolean): void;
        walk(template:array|object,fn:Function): void;
    }

    export class Package {
        static load(path:string,callback:Function);
        static unload(path,callback:Function);
        static reload(path:string,callback:Function);
        static panelInfo(panelID:string);
        static packageInfo(path:string);
        static packagePath(name:string);
        static addPath(path:string);
        static removePath(path:string);
        static resetPath();
        static find(name:string);

        static lang:string;
        static path:string;
        static versions:string;

        /** renderer process */
        static reload(name:string): void;
        static queryInfo(name:string,cb:Function): void;
        static queryInfos(cb:Function): void;
    }

    export class Panel {
        static close(panelId:string,cb:Function);
        static findWindow(panelID:string);
        static templateUrl:string;
      
        /** renderer process */
        static close(panelID:string): void;
        static dock(panelID:string,frameEl:HTMLElement): void;
        static dumpLayout(): void;
        static newFrame(panelID:string,cb:Function): void;
        static extend(proto:object): void;
        static find(panelID:string);
        static focus(panelID:string): void;
        static getFocusedPanel();
        static getPanelInfo(panelID:string);
        static isDirty(panelID:string): boolean;
        static open(panelID:string,argv:object):void;
        static popup(panelID:string):void;
        static undock(panelID:string);

        static panels:any[];
    }

    export class Protocol {
        static register(protocol:string,fn:Function): void;
    }

    export class Window {
        constructor(name:string,options?:{windowType?:'dockable'|'float'|'fixed-size'|'quick',save?:boolean});
        
        adjust(x:number,y:number,w:number,h:number);
        close();
        closeDevTools();
        dispose();
        emptyLayout();
        focus();
        forceClose();
        hide();
        load(editorUrl:string,argv:object);
        minimize();
        openDevTools(options?:{mode?:'right'|'bottom',undocked?:any,detach?:any})
        popupMenu(template:object,x?:number,y?:number);
        resetLayout(url:string);
        restore();
        show();
        send(message:string,...args: any[]);
        isFocused:boolean;
        isLoaded:boolean;
        isMainWindow:boolean;
        isMinimized:boolean;
        panels:string[];

        static defaultLayoutUrl:string;
        static main:Editor.Window;
        static windows:Editor.Window[];
        static addWindow(win:Editor.Window)
        static find(param:string|BrowserWindow|WebContents)
        static removeWindow(win:Editor.Window)

        /** renderer process */
        static open(name:string,url:string,options:object): void;
        static focus(): void;
        static load(url:string,argb:object): void;
        static resize(w:number,h:number,useContentSize:boolean): void;
        static resizeSync(w:number,h:number,useContentSize:boolean): void;
        static center():void;
    }

    export class UI {
        /** DOM Utils Module */

        static createStyleElement(url:string): void;
        static clear(element:HTMLElement): void;
        static index(element:HTMLElement): void;
        static parentElement(element:HTMLElement): void;
        static offsetTo(el:HTMLElement,parentEl:HTMLElement):void;
        static walk(el:HTMLElement,opts?:object,cb?:Function):void;
        static fire(element:HTMLElement,eventName:string,opts:object): void;
        static acceptEvent(event);
        static installDownUpEvent(element:HTMLElement): void;
        static inDocument(el:HTMLElement):boolean;
        static inPanel(el:HTMLElement):boolean;
        static isVisible(el:HTMLElement):boolean;
        static isVisibleInHierarchy(el:HTMLElement):boolean;
        static startDrag(cursor:string,event,onMove:Function,onEnd:Function,onWheel:Function): void;
        static cancelDrag(): void;
        static addDragGhost(cursor:stirng): void;
        static removeDragGhost(): void;
        static addHitGhost(cursor:string,zindex:number,onhit:Function);
        static removeHitGhost(): void;
        static addLoadingMask(options:object,onclick:Function);
        static removeLoadingMask(): void;
        static toHumanText(text:string): void;
        static camelCase(text:string): void;
        static kebabCase(text:string): void;

        /** Element Utils Module */
        static getProperty(type:string);
        static parseArray(txt:string): array;
        static parseBoolean(txt:string):boolean;
        static parseColor(txt:string):object;
        static parseObject(txt:string):object;
        static parseString(txt:string):string;
        static regenProperty(propEl:HTMLElement,cb:Function):void;
        static registerElement(name:string,def:object):void;
        static registerProperty(type:string,protoOrUrl:object|string):void;
        static unregisterProperty(type:string):void;
        
        /** Focus Module */
        static focus(element:HTMLElement):void;
        static focusParent(element:HTMLElement):void;
        static focusNext():void;
        static focusPrev():void;
        static focusedElement:HTMLElement;
        static focusedPanelFrame:any;
        static lastFocusedElement:HTMLElement;
        static lastFocusedPanelFrame:any;

        /** Resources Module */
        static getResource(url:string);
        static importResource(url:string):Promise<any>;
        static importScript(url:string):Promise<any>;
        static importScripts(urls:string[]):Promise<any>;
        static importStylesheet(url:string):Promise<any>;
        static importStylesheets(urls:string[]):Promise<any>;
        static importTemplate(url:string):Promise<any>;
        static loadGlobalScript(url:string,cb:Function)

        /** Settings */
        static Settings:{stepFloat:Function,stepInt:Function,shiftStep:Function};

        /** DragDrop */
        /** 暂无 */
    }

    export class Dockutils {
        root:HTMLElement;
        resizerSpace:object;
    } 

    /** RENDERER PROCESS (WEB PAGE) END */
    /** -------------------------------------------------------------------------------------- */


    /** MODULES FOR BOTH PROCESSES */
    export function KeyCode(key:number|string);
    export const isDarwin:boolean;
    export const isElectron:boolean;
    export const isMainProcess:boolean;
    export const isNative:boolean;
    export const isNode:boolean;
    export const isPureWeb:boolean;
    export const isRendererProcess:boolean;
    export const isRetina:boolean;
    export const isWin32:boolean;

    export class Easing {
        static linear(k:number);
        static fade(k:number);

        static quadIn(k:number);
        static quadOut(k:number);
        static quadInOut(k:number);
        static quadOutIn(k:number);

        static cubicIn(k:number);
        static cubicOut(k:number);
        static cubicInOut(k:number);
        static cubicOutIn(k:number);

        static quartIn(k:number);
        static quartOut(k:number);
        static quartInOut(k:number);
        static quartOutIn(k:number);

        static quintIn(k:number);
        static quintOut(k:number);
        static quintInOut(k:number);
        static quintOutIn(k:number);

        static sineIn(k:number);
        static sineOut(k:number);
        static sineInOut(k:number);
        static sineOutIn(k:number);

        static expoIn(k:number);
        static expoOut(k:number);
        static expoInout(k:number);
        static expoOutIn(k:number);
        
        static circIn(k:number);
        static circOut(k:number);
        static circInOut(k:number);
        static circOutIn(k:number);

        static elasticIn(k:number);
        static elasticOut(k:number);
        static elasticInOut(k:number);
        static elasticOutIn(k:number);

        static backIn(k:number);
        static backOut(k:number);
        static backInOut(k:number);
        static backOutIn(k:number);

        static bounceIn(k:number);
        static bounceOut(k:number);
        static bounceInOut(k:number);
        static bounceOutIn(k:number);
    }

    export class IpcListener { 
        on(message:string,callback:Function);
        once(message:string,callback:Function);
        clear();
    }

    export class JS {
        static addon(obj:object,...args: object[]);
        static assign(obj:object,...args: object[]);
        static assignExcept(obj:object,src:object,except:array);
        static clear(obj:object);
        static copyprop(name:string,source:objcet,target:object);
        static extend(cls:Function,base:Function);
        static extract(obj:object,propNames:string[]);
        static getPropertyByPath(obj:object,path:string);

    }

    export class Math {
        static EPSILON:number;
        static MACHINE_EPSILON:number;
        static TWO_PI:number;
        static HALF_PI:number;
        static D2R:number;
        static R2D:number;
        static deg2rad(degree:number):number;
        static rad2deg(radius:number):number;
        static rad180(radius:number):number;
        static rad360(radius:number):number;
        static deg180(degree:number):number;
        static deg360(degree:number):number;
        static randomRange(min:number,max:number):number;
        static randomRangeInt(min:number,max:number):number;
        static clamp(val:number,min:number,max:number):number;
        static clamp01(val:number,min:number,max:number):number;
        static randomRangeInt(min:number,max:number):number;
        static calculateMaxRect(out,p0,p1,p2,p3):any;

        static lerp(from:number,to:number,ratio:number):number;
        static numOfDecimals(val:number):number;
        static numOfDecimalsF(val:number):number;
        static toPrecision(val:number,precision:number):number;
        static bezier(c0:number,c1:number,c2:number,c3:number,t:number);
        static solveCubicBezier(c0:number,c1:number,c2:number,c3:number,x:number);
    }

    export class Selection {
        static register(type:string);
        static reset();
        static local();
        static confirm();
        static cancel();
        static confirmed(type:string): boolean;
        static select(type:string,id:string,unselectOthers?:boolean,confirm?:boolean);
        static unselect(type:string,id:string,confirm:boolean);
        static hover(type:string,id:string);
        static setContext(type:string,id:string);
        static patch(type:string,srcID:string,destID:string);
        static clear(type:string);
        static hovering(type:string);
        static contexts(type:string);
        static curActivate(type:string);
        static curGlobalActivate(type:string);
        static curSelection(type:string);
        static filter(items:string[],mode:string,func:Function);
    }

    export class Undo {
        static undo();
        static redo();
        static add(id:string,info:string);
        static commit();
        static cancel();
        static collapseTo(index:number);
        static save();
        static clear();
        static reset();
        static dirty();
        static setCurrentDescription(desc:string);
        static register(id:string,cdm:{undo:Function,redo:Function,dirty:Function})
        static Command:{
            undo:Function;
            redo:Function;
            dirty:Function;
        }
    }

    export class Utils {
        static padLeft(text:string,width:number,ch:string);
        static toFixed(value:number,precision:number,optionals:number)
        static formatFrame(frame:number,frameRate:number)
        static smoothScale(curScale:number,delta:number)
        static wrapError(err:Error)
        static arrayCmpFilter(items:any[],func:Function)
        static fitSize(srcWidth:number,srcHeight:number,destWidth:number,destHeight:number)
        static prettyBytes(num:number)
        static run(execFile:string,...args:any[]);
    }

    export class i18n {
        static format(text:string):string;
        static formatPath(path:string):string;
        static t(key:string,option:object);
        static extend(phrases:object);
        static replace(phrases:object);
        static unset(phrases:object);
        static clear();
    }

    /** MODULES FOR BOTH PROCESSES END*/
    /** -------------------------------------------------------------------------------------------- */
}

declare namespace Editor.assetdb {
    
    export function _checkIfMountValid(assetdb, fspath)
    export function _deleteImportedAssets();
    export function _removeUnusedMeta(assetdb, metapath)
    export function _backupUnusedMeta(assetdb, metapath, force):string;
    export function _backupAsset(assetdb, filePath)
    export function _removeUnusedImportFiles()
    export function _removeUnusedMtimeInfo()
    export function _scan(assetdb, fspath, opts, cb)
    export function _checkIfReimport(assetdb, fspath, cb)
    export function _initMetas(assetdb, fspath, cb)
    export function _importAsset(assetdb, fspath, cb)
    export function _postImportAsset(assetdb, assetInfo, cb)
    export function _fillInResults(assetdb, path, meta, results)
    export function _refresh()
    export function _preProcessMoveInput()
    export function _copyFiles()
    export function _generateSubMetaDiff()
    export function _deleteAsset()

    export function init(cb?:Function)
    export function refresh(url, cb?:Function)
    export function deepQuery(cb?:Function)
    export function queryAssets(pattern:string, assetTypes:string,cb)
    export function queryMetas(pattern:string, type:string, cb?:Function)
    export function move(srcUrl, destUrl, cb?:Function)
    // export function delete(urls, cb?:Function)
    export function create(url, data, cb?:Function)
    export function saveExists(url, data, cb?:Function)
    // export function import(rawfiles, url, cb?:Function)
    export function saveMeta(uuid, jsonString, cb?:Function)
    export function exchangeUuid(urlA, urlB, cb?:Function)
    export function clearImports(url, cb?:Function)
    export function register(extname, folder, metaCtor)
    export function unregister(metaCtor)
    export function getRelativePath(fspath):string
    export function getAssetBackupPath(filePath)
    export function setEventCallback(cb)

    export class remote {
        static urlToUuid(url):string;
        static fspathToUuid(fspath):string;
        static uuidToFspath(uuid):string;
        static uuidToUrl(uuid):string;
        static fspathToUrl(fspath):string;
        static urlToFspath(url):string;
        static exists(url):string;
        static existsByUuid(uuid):string;
        static existsByPath(fspath):string;
        static isSubAsset(url):boolean;
        static isSubAssetByUuid(uuid):boolean;
        static isSubAssetByPath(fspath):boolean;
        static containsSubAssets(url):boolean;
        static containsSubAssetsByUuid(uuid):boolean; 
        static containsSubAssetsByPath(path):boolean; 
        static assetInfo(url):object;
        static assetInfoByUuid(uuid):object;
        static assetInfoByPath(fspath):object;
        static subAssetInfos(url):any[];
        static subAssetInfosByUuid(uuid):any[];
        static subAssetInfosByPath(fspath):any[];
        static loadMeta(url):object;
        static loadMetaByUuid(uuid):object;
        static loadMetaByPath(fspath):object;
        static isMount(url):boolean;
        static isMountByPath(fspath):boolean;
        static isMountByUuid(uuid):boolean;
        static mountInfo(url) 
        static mountInfoByUuid(uuid)
        static mountInfoByPath(fspath)
        static mount(path, mountPath, opts, cb?:Function)
        static attachMountPath(mountPath, cb?:Function)
        static unattachMountPath(mountPath, cb?:Function)
        static unmount(mountPath, cb?:Function)
   
    }
};