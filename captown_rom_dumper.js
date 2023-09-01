const GAME_SNES_JS_PATH = "/assets/retro_games/snes/v1/game.js";
const GAME_SNES_WASM_PATH = "/assets/retro_games/snes/v1/8e0666e5c544d30366f9.wasm";
const GAME_NES_JS_PATH = "/assets/retro_games/nes/v1/game.js";
const GAME_NES_WASM_PATH = "/assets/retro_games/nes/v1/b3f5d6116e1d90ff97f8.wasm";

var globalG = null;
var alreadyDumpRom = false;
var isSnes = false;

function uint8ArrayToBase64(src){
    return btoa([...src].map(n => String.fromCharCode(n)).join(""));
}

function encodeStringToUtf8(src){
    var destLength = 3 * src.length + 1;
    var dest = new Uint8Array(destLength);
    var curIdx = 0;
    for(i = 0;i < src.length;i++){
		curCh = src.charCodeAt(i);
		if(curCh == 0)break;
		if(curCh < 128){
			dest[curIdx] = curCh;
            curIdx++;
		}else if(curCh < 2048){
			dest[curIdx] = ((curCh >> 6) + 0xc0);
            curIdx++;
			dest[curIdx] = ((curCh & 0x3f) + 0x80);
			curIdx++;
		}else{
			dest[curIdx] = ((curCh >> 12) + 0xe0);
			curIdx++;
			dest[curIdx] = (((curCh >> 6) & 0x3f) + 0x80);
			curIdx++;
			dest[curIdx] = ((curCh & 0x3f) + 0x80);
			curIdx++;
		}
	}
    var destLength = searchArray(new Uint8Array(1), dest, 1);
    return Uint8Cut(dest, 0, destLength);
}

function uint32toBytes(data, addr, val, isLE){
    if(isLE){
        data[addr + 3] = val >>> 24;
        data[addr + 2] = (val >>> 16) & 0xff;
        data[addr + 1] = (val >>> 8) & 0xff;
        data[addr] = val & 0xff;
    }else{
        data[addr] = val >>> 24;
        data[addr + 1] = (val >>> 16) & 0xff;
        data[addr + 2] = (val >>> 8) & 0xff;
        data[addr + 3] = val & 0xff;
    }
}

function fileSave(data,fn){
    var blob;
    if(typeof data == 'string'){
        var byteString = atob(data.split( "," )[1]);
        for( var i=0, l=byteString.length, content=new Uint8Array( l ); l>i; i++ ) {
            content[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([content]);
    }else{
        blob = new Blob([data]);
    }
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fn;
    link.click();
}

function Uint8Cat(){
    var destLength = 0
    for(var i = 0;i < arguments.length;i++)destLength += arguments[i].length;
    var dest = new Uint8Array(destLength);
    var index = 0;
    for(i = 0;i < arguments.length;i++){
        dest.set(arguments[i],index);
        index += arguments[i].length;
    }
    return dest;
}

function Uint8Cut(data,addr,size){
    var buf = new Uint8Array(size);
    for(var i = 0;i < size;i++){
        buf[i] = data[addr + i];
    }
    return buf;
}

function insertArray(src, index, target){
    var before = Uint8Cut(src, 0, index);
    var after = Uint8Cut(src, index, src.length - index);
    return Uint8Cat(before, target, after);
}

function memcmp(src1, src1Addr, src2, src2Addr, length){
    for(var i = 0;i < length;i++){
        if(src1[i + src1Addr] != src2[i + src2Addr])return false;
    }
    return true;
}

function searchArray(search, target, searchBy){
    var searchlength = search.length;
    var targetlength = target.length;
    if(searchBy === 0)searchBy = searchlength;
    for(var i = 0;i < targetlength;i += searchBy){
        if(memcmp(search, 0, target, i, searchlength))return i;
    }
    return -1;
}

function searchNesRom(heapMem){
    var search = new Uint8Array([0x4E, 0x45, 0x53, 0x1A]);
    var searchResult = searchArray(search, heapMem, 0);
    if(searchResult < 0)return null;
    var iNESHeader = Uint8Cut(heapMem, searchResult, 0x10);
    var prgRomSize = iNESHeader[4] * 16384;
    search = new Uint8Array(8);
    uint32toBytes(search, 0, 0x14, true);
    uint32toBytes(search, 4, prgRomSize + 0x8, true);
    var prgRomOffset = searchArray(search, heapMem, 0);
    if(prgRomOffset < 0)return null;
    prgRomOffset += 8;
    var prgRom = Uint8Cut(heapMem, prgRomOffset, prgRomSize);
    var chrRomSize = iNESHeader[5] * 8192;
    var chrRom = new Uint8Array(0);
    if(chrRomSize !== 0){
        uint32toBytes(search, 4, chrRomSize + 0x8, true);
        var chrRomOffset = searchArray(search, heapMem, 0);
        if(chrRomOffset < 0)return null;
        chrRomOffset += 8;
        chrRom = Uint8Cut(heapMem, chrRomOffset, chrRomSize);
    }
    return Uint8Cat(iNESHeader, prgRom, chrRom);
}

function searchSnesRom(heapMem, romSize){
    var search = new Uint8Array(8);
    uint32toBytes(search, 0, 0x14, true);
    uint32toBytes(search, 4, romSize + 0x8, true);
    var searchResult = searchArray(search, heapMem, 0);
    if(searchResult >= 0){
        return Uint8Cut(heapMem, searchResult + 8, romSize);
    }
    return null;
}

insertString = "globalG=s;";
insertString2 = ";e.exports=\"" + GAME_SNES_WASM_PATH + "\";";
insertSearchString = "window.addEventListener(\"gamepadconnected\"";
insertSearchString2 = "}},t={};function";
var romSize = 0;
var jsPath = GAME_SNES_JS_PATH;

function insertScript(targetScript, search, insert){
    var targetIndex = searchArray(search, targetScript, 1);
    if(targetIndex < 0)return;//globalG=s;の挿入に失敗
    return insertArray(targetScript, targetIndex, insert);
}

function dumpRom(){//1秒毎に実行
    if(alreadyDumpRom)return;
    if(globalG === null || romSize === 0)return;
    alreadyDumpRom = true;
    var wasmHeapMem = Uint8Cut(globalG.emulator.module.HEAP8, 0, 1024 * 1024 * 32);//wasm vm内のヒープメモリ(最初の32MBのみを取得)
    var decryptedRom;
    var saveRomName = "rom.sfc";
    if(isSnes){
        decryptedRom = searchSnesRom(wasmHeapMem, romSize);
    }else{
        decryptedRom = searchNesRom(wasmHeapMem);
        saveRomName = "rom.nes";
    }
    if(decryptedRom === null){
        alert("rom取得失敗");
    }else{
        fileSave(decryptedRom, saveRomName);
    }
}

function fetchRom(){//romSizeを取得するための関数
    fetch(document.getElementById("rom_url").value)
        .then(response => {
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            var rom = new Uint8Array(arrayBuffer);
            romSize = rom.length - 0x80;
            console.log("romSize = " + romSize);
        })
        .catch(error => {
});}

function runScript(script){
    var scriptBase64 = uint8ArrayToBase64(script);
    var s = document.createElement('script');
    s.setAttribute('src', 'data:application/javascript;base64,' + scriptBase64);
    document.body.appendChild(s);
}

function main(){
    fetchRom();
    try{
        if(document.getElementById("game-language").nextElementSibling.src.indexOf("snes") >= 0)isSnes = true;
    }catch{
        alert("このWebページでは実行できません。\n実行できるWebページの例: https://captown.capcom.com/ja/retro_games/1/ja");
        return;
    }
    if(!isSnes){
        insertString2 = ";e.exports=\"" + GAME_NES_WASM_PATH + "\";";
        jsPath = GAME_NES_JS_PATH;
    }
    fetch(jsPath)
        .then(response => {
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            var script = new Uint8Array(arrayBuffer);
            script = insertScript(script, encodeStringToUtf8(insertSearchString), encodeStringToUtf8(insertString));
            script = insertScript(script, encodeStringToUtf8(insertSearchString2), encodeStringToUtf8(insertString2));
            runScript(script);
            setInterval("dumpRom()", 1000);

        })
        .catch(error => {
    });
}

main();