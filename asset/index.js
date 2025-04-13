'use strict';
import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { gsCharacters, gsdynamicTranslates } from './gsCharacters.js'
import { voices, gscharacterSubstitutes } from './voices.js';
import { gsCards } from './gsCards.js';
const CHARACTER = { ...gsCharacters }, VOICES = { ...voices };
//这些前缀对应的汉语翻译
lib.gs.prefix = {
	//gs_: '原'
}
const characters = {}, characterTitles = {}, characterIntros = {}, skills = {}, translates = {
};
for (let name in VOICES) {//导入语音
	if (typeof VOICES[name] == 'string') {
		if (name.startsWith('gs_')) translates[`#${name}:die`] = VOICES[name];//筛选阵亡语音
		else translates[`#ext:原杀/asset/gs/audio/${name}`] = VOICES[name];//筛选技能语音
	}
}
/**country=>国家 eg：蒙德 璃月 稻妻 ... */
for (let sort in CHARACTER) {
	/**name=>角色名|技能名 eg：gs_lisha、gsmaichongdemonv */
	for (let name in CHARACTER[sort]) {
		/**角色前置数组
		 * @example
		 * values = ['武将名', ['性别', '势力', '体力|上限|护甲', ['技能1', '技能2'], ['其他']], '称号', '介绍'],
		 * values = 技能1: {}
		 * values = '技能1|此技能的描述'
		 */
		const values = CHARACTER[sort][name];
		if (Array.isArray(values)) {//武将组
			characters[name] = values.find(i => Array.isArray(i));//角色数组
			/**3个字符串组成的组
			 * @example
			 * temps = ['武将名', '称号', '介绍']
			 */
			const temps = values.filter(i => typeof i == 'string');
			//原画和阵亡语音
			if (!characters[name][4].some(i => i.startsWith('ext:原杀'))) characters[name][4].add(`ext:原杀/asset/gs/image/${name}.jpg`);
			if (!characters[name][4].some(i => i.startsWith('die:'))) characters[name][4].add(`die:ext:原杀/asset/gs/audio:true`);
			if (temps[0]) {
				for (const prefix in lib.gs.prefix) {
					// 如果武将名有这个前缀，就给翻译前加对应的汉字
					if (name.startsWith(prefix)) {
						translates[name] = lib.gs.prefix[prefix] + temps[0];
						translates[name + '_prefix'] = lib.gs.prefix[prefix];
					}
				}
				//没有前缀的就直接赋值
				if (!Object.keys(lib.gs.prefix).some(key => name.startsWith(key))) translates[name] = temps[0];
			}
			if (temps[1] && (lib.config['extension_千幻聆音_qhly_currentViewSkin'] != 'shousha')) characterTitles[name] = temps[1];//称号
			if (temps[2]) characterIntros[name] = temps[2];//介绍
		} else if (get.is.object(values)) {//技能
			skills[name] = values;
		} else if (typeof values == 'string') {//描述
			//如果描述里有|分割，说明前半部分是技能名，后半部分是真正的描述
			if (name.slice(-5) == '_info' && values.includes('|')) {
				translates[name.slice(0, name.length - 5)] = values.split('|')[0]
				translates[name] = values.split('|')[1]
			} else translates[name] = values;
		}
	}
}
game.import("character", () => {
	/** @type { importCharacterConfig } */
	let gs = {
		name: 'gsCharacter',
		connect: false,
		character: characters,
		characterTitle: characterTitles,
		characterIntro: characterIntros,
		characterFilter: {},
		characterSort: { gsCharacter: {} },
		skill: skills,
		translate: translates,
		dynamicTranslate: { ...gsdynamicTranslates },
		characterSubstitute: {},
	};
	//按照势力进行分包
	for (let name in gs.character) {
		!gs.characterSort.gsCharacter[gs.character[name][1]] && (gs.characterSort.gsCharacter[gs.character[name][1]] = [])
		gs.characterSort.gsCharacter[gs.character[name][1]].add(name);
	}
	return gs;
})
lib.config.all.characters.unshift('gsCharacter');
lib.translate['gsCharacter_character_config'] = `<img src="${lib.assetURL}extension/原杀/other/image/gsCharacter.png" width="76" height="22">`;


//——————————————整合卡牌信息——————————————//
/**初始化一些常用属性 */
const CARD = { card: {}, skill: {}, translate: {}, list: [] }
//依次导入
for (let index in gsCards) Object.assign(CARD[index], gsCards[index]);
for (let name in CARD.card) {
	const value = CARD.card[name];
	//将card里的翻译转移到translate，然后删除旧的
	if (Array.isArray(value)) {//['卡牌名','卡牌描述','卡牌引文']
		delete CARD.card[name];
		if (value.length >= 1) CARD.translate[name.slice(0, name.length - 5)] = value[0];
		if (value.length >= 2) CARD.translate[name.slice(0, name.length - 5) + '_info'] = value[1];
		if (value.length >= 3) CARD.translate[name.slice(0, name.length - 5) + '_append'] = '<span class=\"text\" style=\"font-family: yuanli\">' + value[2] + '</span>';
	}
	//自动补足文件地址
	else if (typeof value == 'object') {
		value.fullskin && (value.image = `ext:原杀/asset/gsCard/image/${name}.png`);
		value.fullimage && (value.image = `ext:原杀/asset/gsCard/image/${name}.jpg`);
	}
}
//——————————————导入卡牌——————————————//
lib.config.all.cards.unshift('gsCard');
lib.translate['gsCard_card_config'] = `<img src="${lib.assetURL}extension/原杀/other/image/gsCard.png" width="76" height="22">`;
game.import('card', () => {
	/** @type { importCardConfig } */
	return { name: 'gsCard', connect: true, ...CARD };
});