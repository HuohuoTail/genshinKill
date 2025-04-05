'use strict';
import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { gsCharacters } from './gsCharacters.js'
import { gsCards } from './gsCards.js';

//——————————————导入武将——————————————//
game.import("character", () => {
	/** @type { importCharacterConfig } */
	const gsCharacter = {
		name: 'gsCharacter',
		connect: true,
		perfectPair: {},
		characterFilter: {},
		characterReplace: {},
		dynamicTranslate: {},
		characterSubstitute: {},
	}
	Object.assign(gsCharacter, gsCharacters)
	return gsCharacter;
})
lib.config.all.characters.unshift('gsCharacter');
lib.translate['gsCharacter_character_config'] = `原杀武将`;

//——————————————导入卡牌——————————————//
game.import('card', () => {
	/** @type { importCardConfig } */
	const gsCard = {
		name: 'gsCard',
		connect: true,
	}
	Object.assign(gsCard, gsCards)
	return gsCard;
});
lib.config.all.cards.unshift('gsCard');
lib.translate['gsCard_card_config'] = `原杀卡牌`;