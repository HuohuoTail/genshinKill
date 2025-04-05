'use strict';
import { lib, game, ui, get, ai, _status } from "../../noname.js";
import { PRECONTENT, CONTENT, CONFIG, HELP } from './other/main.js'

//把文件里的原杀信息导入
const extensionInfo = await lib.init.promises.json(`${lib.assetURL}extension/原杀/info.json`);
//建议无名杀版本
game.saveConfig('noname_version', extensionInfo.noname_version)
//扩展版本
game.saveConfig('gs_version', extensionInfo.version)
if (lib.version.includes("β")) {
    alert('您安装的客户端APP与《原杀》不兼容，将导致bug产生。\n建议您重新安装开源的无名杀客户端\n为保护您的设备和众人的合法权益，本扩展已自动关闭');
    game.saveConfig('extension_原杀_enable', false);
    game.reload();
}
// 针对原杀现版本和建议版本进行提醒
if (lib.version && lib.config.gs_setCompareVersion != lib.config.noname_version) {
    game.saveConfig('gs_setCompareVersion', lib.config.noname_version);
    /**做一个可以检测版本的函数
     * 依次遍历每组数字，如果相等就继续遍历，大于和小于都是不兼容
     * @param {string} target 当前版本  //1.0.5
     * @param {string} normal 建议的版本号  //1.10.13.1
     * @returns {boolean}
     */
    const compareVersion = (target, normal) => {
        const targets = target.split('.').map(Number),//['1', '0', '5']
            normals = normal.split('.').map(Number); //['1', '10', '13', '1']
        const count = Math.max(targets.length, normals.length);//遍历尽可能多的版本号数字=>4
        let i = 0;
        while (i < count) {
            const tar = targets[i] || 0, nor = normals[i] || 0;
            if (tar < nor) return false;
            if (nor > tar) return true;
            i++;
        }
        return true;//完全相同
    }
    if (!compareVersion(lib.version, lib.config.noname_version)) {
        const bool = confirm(`当前无名杀版本为${lib.version}，低于《原杀》建议版本（${lib.config.noname_version}），请尽快更新无名杀！
                点击确认，关闭扩展（再次开启扩展，将不会弹窗）
                点击取消，继续游玩（1%的机制可能发生兼容问题）`);
        if (bool) game.saveConfig('extension_原杀_enable', false);
    }
}
game.import("extension", function (lib, game, ui, get, ai, _status) {
    return {
        name: "原杀", editable: false,
        precontent: PRECONTENT,
        content: CONTENT,
        help: HELP,
        config: CONFIG,
        package: {
            intro: `扩展版本：<span class='thundertext'>${extensionInfo.version}</span></br>${extensionInfo.intro}`,
            diskURL: extensionInfo.diskURL,
            author: extensionInfo.author,
            version: `扩展版本：<span class='thundertext'>${extensionInfo.version}</span>`,//版本号
        },
        onremove() {
            // 用于落后检测
            game.saveConfig('noname_version', undefined)// 建议的无名杀版本
            game.saveConfig('gs_setCompareVersion', undefined);// 存储最后一次检测版本的参数
            game.saveConfig('gs_version', undefined)//当前的扩展版本
            game.saveConfig('extension_原杀_init', undefined);//一次性开启武将包
            game.saveConfig('extension_原杀_gs_elementPosition', undefined);//图标显示位置
            game.saveConfig('extension_原杀_gs_elementPosition2', undefined);//图标显示位置
        },
    };
});