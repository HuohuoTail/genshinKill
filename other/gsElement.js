import { lib, game, ui, get, ai, _status } from '../../../noname.js';

/** @type { importCharacterConfig} */
export const gsElement = async function () {
	// 护盾系统  检测是否已有护盾系统（来自崩崩崩扩展），若无则加载护盾系统。
	if (typeof lib.element.player.gainHudun != 'function') {
		Object.assign(lib.element.player, {
			/**获得护盾
			 * @param { [Card] } cards 被作为护盾的牌
			 * @param { Player } [source] 来源
			 * @returns { GameEventPromise }
			 */
			gainHudun(cards, source) {
				const next = game.createEvent('gainHudun');
				next.player = this;
				next.cards = cards;
				next.source = (get.itemtype(source) == 'player' ? source : this);
				next.setContent('gainHudun');
				return next;
			},
			/**移除护盾
			 * @param { Number } num 移除护盾的层数
			 * @param { Player | 'nosource' } source 来源
			 * @param { 'reduce' | 'damage' } type 衰减reduce|伤害damage，默认衰减
			 * @returns { GameEventPromise }
			 */
			loseHudun(num, source, type = 'reduce') {
				const next = game.createEvent('loseHudun');
				next.player = this;
				next.num = num > 0 ? num : (num <= 0 ? 0 : 1)
				next.source = get.itemtype(source) == 'player' ? source : this
				next.type = ['reduce', 'damage'].includes(type) ? type : 'reduce';
				next.setContent('loseHudun');
				return next;
			},
			/**转移护盾
			 * @param { Number } num 交出的数量
			 * @param { Player } target 目标角色
			 * @returns { GameEventPromise }
			 */
			giveHudun(num, target) {
				const next = game.createEvent('giveHudun');
				next.player = this;
				next.num = num > 0 ? num : (num <= 0 ? 0 : 1)
				next.target = target
				next.source = get.itemtype(source) == 'player' ? source : this
				next.setContent('giveHudun');
				return next;
			},
		})
		Object.assign(lib.element.content, {
			//获得护盾
			async gainHudun(event, trigger, player) {
				/**不合法 */
				if (!event.cards?.length) { event.finish(); return; }
				/**规格化num */
				event.num = event.cards.length;
				/**根据来源分类执行 */
				if (get.itemtype(event.source) == 'player') {
					await player.addToExpansion(event.cards, event.source, 'give').gaintag.add('bhhudun');
				} else {
					await player.addToExpansion(event.cards, 'gain2').gaintag.add('bhhudun');
				}
				game.log(player, '获得了', get.cnNumber(event.cards.length), '张<span style="color:gray">盾</span>');
				await event.trigger('gainHudun');
			},
			//移除护盾
			async loseHudun(event, trigger, player) {
				/**不合法 */
				if (player.getExpansions('bhhudun').length == 0 || !event.num > 0) { event.finish(); return; }
				/**随机取出作为护盾的牌 */
				event.cards = player.getExpansions('bhhudun').randomGets(event.num)
				event.num = Math.min(event.num, event.cards.length);
				if (event.type == 'reduce') game.playAudio('..', 'extension', '崩崩崩/audio/jizhi', 'bhhudun_reduce1');
				await player.loseToDiscardpile(event.cards);

				game.log(player, `因${event.type == 'damage' ? '受到伤害' : '衰减'}失去了${get.cnNumber(event.num)}张<span style="color:gray">盾</span>`);
				await event.trigger('loseHudun');
			},
			//转移护盾
			async giveHudun(event, trigger, player) {
				/**不合法 */
				if (!player.getExpansions('bhhudun').length || !event.num > 0 || event.target == player) { event.finish(); return; }
				/**随机取出作为护盾的牌 */
				event.num = Math.min(event.num, event.cards.length);
				event.cards = player.getExpansions('bhhudun').randomGets(event.num);
				await event.target.gainHudun(cards2, player);
				if (player.getExpansions('bhhudun').length > 0) player.markSkill('bhhudun');
				else player.unmarkSkill('bhhudun');
				player.syncStorage('bhhudun');

				game.log(player, '转移了' + get.cnNumber(event.num) + '张<font color=\'gray\'>盾</font>', '给', event.target);
				await event.trigger('giveHudun');
			},
		})
		//受伤移除护盾
		lib.skill._bhhudun_damage = {
			trigger: {
				player: 'damageBegin1',
			},
			forced: true,
			charlotte: true,
			unique: true,
			filter(event, player) {
				return player.getExpansions('bhhudun').length > 0;
			},
			async content(event, trigger, player) {
				const baseNum = trigger.bhhudun_weak ? 1 : 2,
					hudun_length = player.getExpansions('bhhudun').length,
					lose_length = Math.min(trigger.num * baseNum, hudun_length)
				//击破
				if (lose_length == hudun_length) game.playAudio('..', 'extension', '崩崩崩/audio/jizhi', 'bhhudun_damage3');
				//暴击
				else if (trigger.num > 1) game.playAudio('..', 'extension', '崩崩崩/audio/jizhi', 'bhhudun_damage2');
				//受伤
				else game.playAudio('..', 'extension', '崩崩崩/audio/jizhi', 'bhhudun_damage1');

				await player.loseHudun(lose_length, trigger.source ?? 'nosource', 'damage');

				trigger.num -= parseInt(lose_length / baseNum);
				if (trigger.num > 0) trigger.bhhudun_overflow = true;
			},
		}
		//衰减
		lib.skill._bhhudun_reduce = {
			trigger: {
				player: 'phaseBegin',
			},
			forced: true,
			charlotte: true,
			priority: 1000000,
			unique: true,
			filter(event, player) {
				return player.getExpansions('bhhudun').length > 0;
			},
			async content(event, trigger, player) {
				player.loseHudun(Math.max(parseInt(player.getExpansions('bhhudun').length / 2), 1), 'nosource', 'reduce');
			},
		}
		//护盾标记
		lib.skill.bhhudun = {
			marktext: "盾",
			forced: true,
			charlotte: true,
			unique: true,
			intro: {
				name: "盾",
				content: "expansion",
				markcount: "expansion",
			},
		};
	}
	///——————————————————————————————————————————————————————————————参数
	if (!lib.gs) lib.gs = {//add sub mul div
		/**元素优先级 */
		elementOrder: [
			'fire', 'water', 'wind', 'thunder', 'grass', 'ice', 'rock',
			'fire_grass', 'thunder_grass', 'water_ice', 'water_grass',
		],
		/**反应列表优先级 */
		reactionOrder: new Map([
			['fire', ['water_grass', 'thunder', 'wind', 'water', 'ice', 'water_ice', 'grass', 'thunder_grass', 'rock']],
			['water', ['fire', 'fire_grass', 'wind', 'ice', 'grass', 'thunder_grass', 'thunder', 'rock']],
			['wind', ['thunder', 'fire', 'fire_grass', 'water', 'ice', 'water_ice']],
			['thunder', ['water_grass', 'thunder_grass', 'fire', 'fire_grass', 'wind', 'water', 'ice', 'water_ice', 'grass', 'rock']],
			['grass', ['thunder_grass', 'thunder', 'fire', 'water']],
			['ice', ['thunder', 'fire', 'fire_grass', 'wind', 'water', 'rock']],
			['rock', ['thunder', 'fire', 'fire_grass', 'water', 'ice', 'water_ice']],

			['fire_grass', ['water_grass', 'thunder', 'wind', 'water', 'ice', 'water_ice', 'rock',]],
			['thunder_grass', ['grass', 'thunder', 'fire', 'water']],
			['water_ice', ['thunder', 'fire', 'fire_grass', 'wind', 'rock']],
			['water_grass', ['thunder', 'fire', 'fire_garss']],
		]),
		/**元素反应列表 */
		reactionList: new Map([
			['fire', [
				['烈绽放', 'fire|water_grass'],
				['超载', 'fire|thunder'],
				['扩散', 'fire|wind'],
				['蒸发', 'fire|water'],
				['融化', 'fire|ice'],
				['融化', 'fire|water_ice'],
				['燃烧', 'fire|grass'],
				['燃烧', 'fire|thunder_grass'],
				['结晶', 'fire|rock']]],
			['water', [
				['蒸发', 'fire|water'],
				['蒸发', 'water|fire_grass'],
				['扩散', 'water|wind'],
				['冻结', 'water|ice'],
				['原绽放', 'water|grass'],
				['原绽放', 'water|thunder_grass'],
				['感电', 'water|thunder'],
				['结晶', 'water|rock']]],
			['wind', [
				['扩散', 'wind|thunder'],
				['扩散', 'fire|wind'],
				['扩散', 'fire|wind'],
				['扩散', 'water|wind'],
				['扩散', 'wind|ice'],
				['扩散', 'wind|ice']]],
			['thunder', [
				['超绽放', 'thunder|water_grass'],
				['超激化', 'thunder|thunder_grass'],
				['超载', 'fire|thunder'],
				['超载', 'thunder|fire_grass'],
				['扩散', 'wind|thunder'],
				['感电', 'water|thunder'],
				['超导', 'thunder|ice'],
				['超导', 'thunder|water_ice'],
				['原激化', 'thunder|grass'],
				['结晶', 'thunder|rock']]],
			['grass', [
				['蔓激化', 'grass|thunder_grass'],
				['原激化', 'thunder|grass'],
				['燃烧', 'fire|grass'],
				['原绽放', 'water|grass']]],
			['ice', [
				['超导', 'thunder|ice'],
				['融化', 'fire|ice'],
				['融化', 'ice|fire_grass'],
				['扩散', 'wind|ice'],
				['冻结', 'water|ice'],
				['结晶', 'ice|rock']]],
			['rock', [
				['结晶', 'thunder|rock'],
				['结晶', 'fire|rock'],
				['结晶', 'fire|rock'],
				['结晶', 'water|rock'],
				['结晶', 'ice|rock'],
				['结晶', 'ice|rock']]],
			['fire_grass', [
				['烈绽放', 'fire_grass|water_grass'],
				['超载', 'thunder|fire_grass'],
				['扩散', 'wind|fire'],
				['蒸发', 'water|fire_grass'],
				['融化', 'ice|fire_grass'],
				['融化', 'fire_grass|water_ice'],
				['结晶', 'fire_grass|rock']]],
			['thunder_grass', [
				['蔓激化', 'grass|thunder_grass'],
				['超激化', 'thunder|thunder_grass'],
				['燃烧', 'fire|thunder_grass'],
				['原绽放', 'water|thunder_grass']]],
			['water_ice', [
				['超导', 'thunder|water_ice'],
				['融化', 'fire|water_ice'],
				['融化', 'fire_grass|water_ice'],
				['扩散', 'wind|ice'],
				['结晶', 'water_ice|rock']]],
			['water_grass', [
				['超绽放', 'thunder|water_grass'],
				['烈绽放', 'fire|water_grass'],
				['烈绽放', 'fire_garss|water_grass']]],
		]),
	};
	/* 采用官方途径导入属性，颜色与对应势力相同，order越大优先级越高*/
	if (lib.nature) {
		lib.nature.set('fire', 110)
		game.addNature('water', '水', {
			linked: true,
			order: 109,
			lineColor: [0, 102, 255],
			color: [0, 102, 255],
		});
		game.addNature('wind', '风', {
			linked: true,
			order: 108,
			lineColor: [80, 223, 223],
			color: [80, 223, 223],
		});
		game.addNature('thunder', '雷', {
			linked: true,
			order: 107,
			lineColor: [175, 0, 161],
			color: [175, 0, 161],
		})//#af00a1
		game.addNature('grass', '草', {
			linked: true,
			order: 106,
			lineColor: [25, 124, 0],
			color: [25, 124, 0],
		});
		lib.nature.set('ice', 105)
		game.addNature('rock', '岩', {
			linked: true,
			order: 104,
			lineColor: [206, 156, 19],
			color: [206, 156, 19],
		});
		game.addNature('fire_grass', '燃', {
			linked: true,
			order: 103,
			lineColor: [255, 0, 0],
			color: [255, 0, 0],
		});
		game.addNature('thunder_grass', '激', {
			linked: true,
			order: 102,
			lineColor: [180, 0, 216],
			color: [180, 0, 216],
		});
		game.addNature('water_ice', '冻', {
			linked: true,
			order: 101,
			lineColor: [59, 98, 115],
			color: [59, 98, 115],
		});
		game.addNature('water_grass', '核', {
			linked: true,
			order: 100,
			lineColor: [25, 124, 0],
			color: [25, 124, 0],
		});
	}
	/**导入所有元素反应的翻译 */
	for (let [first, reactionList] of lib.gs.reactionList) reactionList.forEach(names => lib.translate[names[1]] = names[0]);
	///——————————————————————————————————————————————————————————————技能
	/** @type { importCharacterConfig['skill'] } */
	const skill = {
		/**标记显示 */
		gs_element: {
			locked: true,
			unique: true,
			superCharlotte: true,
			charlotte: true,
			marktext: '⨷',
			intro: {
				name: "元素附着",
				content(storage, player, skill) {
					if (!player.gs_getElementList().length) return '没有元素附着'
					let str = '<table style="text-align:center"><tr>'
					//第一行 元素名
					str += `<th>元素</th>`
					for (let element of player.gs_getElementList()) {
						str += `<th>${get.gs_colorText(element, get.translation(element))}</th>`
					}
					str += '</tr><tr>';
					str += `<th>元素量</th>`
					//第二行 元素层数
					for (let element of player.gs_getElementList()) {
						str += `<th>${player.gs_countElement(element)}</th>`
					}
					str += '</tr><tr>';
					str += `<th>持续值</th>`
					//第三行 元素持续值
					for (let element in player.gs_getElement('time')) {
						str += `<th>${player.gs_getElement('time')[element]}</th>`
					}
					str += '</tr></table>'
					return str;
				},
				markcount(storage, player) {
					return player.gs_getElementList().length + '';
				},
			},
		},
		/**附着后自动反应
		 * 自然衰减
		 * 持续值归零自动移除
		 * 伤害附着法、牌类附着法
		 */
		_gs_Auto: {
			forced: true,
			lastDo: true,
			popup: false,
			priority: -Infinity,
			trigger: {
				player: ['damageBegin3', 'gainElementAfter', 'phaseOver', 'changeTimeAfter'],
				target: ['useCardToAfter']
			},
			async content(event, trigger, player) {
				switch (trigger.name) {
					case 'damage'://伤害附着法
						if (get.is.object(trigger.elementObj) || get.is.object(trigger.card?.elementObj)) {
							if (!get.is.object(trigger.elementObj)) game.setElement(trigger, trigger.card.elementObj)//把卡牌的元素给予伤害
							console.log(await player.gainElement(trigger.elementObj))
						}
						break;
					case 'gainElement'://附着后自动反应
						await player.reactionAuto(trigger)
						break;
					case 'phaseLoop'://自然衰减
						if (game.hasPlayer(current => current.gs_getElementList().length > 0)) {
							let current = player.next;
							do {
								for (const element of current.gs_getElementList()) {
									await current.changeTime(element, -1)
								}
								current = current.next;
							} while (current != player.next);
						}
						break;
					case 'changeTime'://持续值归零自动移除
						if (!player.gs_element[trigger.element]?.time > 0) {
							await player.removeElement(trigger.element, trigger, 'nosource');
							if (player.gs_hasElement(trigger.element)) player.gs_element[trigger.element].time = game.players.length + 1
						}
						break;
					default://牌类附着法
						if (get.is.object(trigger.card.elementObj)) {
							//如果此牌已通过伤害的形式附着过元素，则不执行此类附着
							const historys = game.getGlobalHistory('everything', (evt) => {
								if (evt.name == "gainElement" && evt.getParent().name == '_gs_Auto') {//查找伤害类附着
									return evt.getParent('damage', true, true).card == trigger.card//存在一个伤害事件与当前事事件有相同牌
								}
							});
							if (!historys.length) await player.gainElement(trigger.card.elementObj);
						}
				}
			}
		},
		/**二级元素的效果 */
		_gs_secondElement: {
			forced: true,
			popup: false,
			trigger: {//燃核衰减和冻受伤
				player: ['removeElementAfter', 'damageBegin3']
			},
			filter(event, player) {
				if (event.name == 'damage') {
					if (!player.gs_hasElement('water_ice')) return false;
					return event.nature ? event.nature.split(lib.natureSeparator).includes('fire') : event.num >= 2;
				}
				const evt = event.getParent()
				return get.is.gs_element(event.element) && evt.triggername == "changeTimeAfter" && evt.name == "_gs_Auto"
			},
			async content(event, trigger, player) {
				if (trigger.name == 'damage') {
					trigger.num++;
					game.log(player, `触发${get.gs_colorText('water_ice', '冰冻')}元素效果`)
					await player.removeElement('water_ice', 99, trigger.source, trigger)
					event.finish();
					return;
				}
				let element = trigger.element;
				switch (element) {
					case 'fire_grass': {
						if (player.countCards('h') > 0) {
							const card = player.getCards('h').randomGet();
							player.showCards([card], `因${get.gs_colorText('fire_grass', '燃烧衰减')}展示`);
							const bool = await player.chooseUseTarget(card).forResultBool();
							if (!bool) {
								game.log(player, `触发${get.gs_colorText('fire_grass', '燃烧衰减')}元素效果`)
								await player.damage('fire', 'nosource');
							}
						}
						break;
					}
					case 'water_grass': {
						game.log(player, `触发${get.gs_colorText('water_grass', '草原核')}元素效果`)
						await player.damage('grass', 'nosource');
						break;
					}
					default: break;
				}
			},
			//冻结
			get mod() {
				let mod = {};
				mod.cardEnabled = mod.cardEnabled2 = mod.cardUsable = mod.cardRespondable = mod.cardSavable = (undefined, player) => {
					if (player.gs_hasElement('water_ice') && (player.hasHistory('useCard') || player.hasHistory('respond'))) return false;
				}
				return mod;
			},
		},
		/**元素共鸣的效果 */
		_gs_buff: {
			forced: true,
			lastDo: true,
			popup: false,
			subSkill: {
				fire: {},
				water: {
					forced: true,
					silent: true,
					lastDo: true,
					trigger: {
						player: 'phaseJieshuBegin'
					},
					filter(event, player) {
						return player.gs_hasBuff('water');
					},
					async content(event, trigger, player) {
						game.log(player, '触发', get.gs_colorText('water', '疗愈之水'))
						const cards = get.cards(2);
						await player.showCards(cards, '因' + get.gs_colorText('water', '疗愈之水') + '亮出牌堆顶两张牌');
						const gains = cards.filter(i => get.color(i) == 'red');
						if (gains.length) {
							const index = await player
								.chooseControl('回复1点体力', '获得' + get.translation(gains))
								.set('ai', () => {
									if (player.isDamaged()) {
										if (player.hp <= 2) return 0;
									}
									return 1;
								})
								.forResult('index');
							if (index) player.gain(gains, 'gain2')
							else player.recover()
						}
					}
				},
				wind: {
					forced: true,
					silent: true,
					lastDo: true,
					trigger: {
						player: ['turnOverBefore', 'linkBefore']
					},
					filter(event, player) {
						return player.gs_hasBuff('wind') &&
							(event.name == 'trunOver' ? !player.isTurnedOver() : !player.isLinked());
					},
					async content(event, trigger, player) {
						game.log(player, '触发', get.gs_colorText('wind', '迅捷之风'))
						trigger.cancel()
					},
				},
				thunder: {
					trigger: {
						player: "phaseDrawBegin1",
					},
					forced: true,
					silent: true,
					lastDo: true,
					filter(event, player) {
						return player.gs_hasBuff('thunder') && !event.numFixed;
					},
					async content(event, trigger, player) {
						game.log(player, '触发', get.gs_colorText('thunder', '强能之雷'))
						trigger.num++;
					},
				},
				grass: {
					forced: true,
					silent: true,
					lastDo: true,
					trigger: {
						player: "phaseZhunbeiBegin",
					},
					filter(event, player) {
						return player.gs_hasBuff('grass');
					},
					async content(event, trigger, player) {
						game.log(player, '触发', get.gs_colorText('grass', '蔓生之草'))
						const cards = get.cards(3);
						game.cardsGotoOrdering(cards);
						const next = player.chooseToMove();
						next.set("list", [["牌堆顶", cards], ["牌堆底"]]);
						next.set("prompt", get.gs_colorText('grass', '蔓生之草') + "：点击将牌移动到牌堆顶或牌堆底");
						next.processAI = list => {
							const cards = list[0][1],
								player = _status.event.player;
							const top = [];
							const judges = player.getCards("j");
							let stopped = false;
							if (!player.hasWuxie()) {
								for (let i = 0; i < judges.length; i++) {
									const judge = get.judge(judges[i]);
									cards.sort((a, b) => judge(b) - judge(a));
									if (judge(cards[0]) < 0) {
										stopped = true;
										break;
									} else {
										top.unshift(cards.shift());
									}
								}
							}
							let bottom;
							if (!stopped) {
								cards.sort((a, b) => get.value(b, player) - get.value(a, player));
								while (cards.length) {
									if (get.value(cards[0], player) <= 5) break;
									top.unshift(cards.shift());
								}
							}
							bottom = cards;
							return [top, bottom];
						};
						const moved = await next.forResult('moved')
						const top = moved[0];
						const bottom = moved[1];
						top.reverse();
						game.cardsGotoPile(top.concat(bottom), ["top_cards", top], (event, card) => {
							if (event.top_cards.includes(card)) return ui.cardPile.firstChild;
							return null;
						});
						player.popup(get.cnNumber(top.length) + "上" + get.cnNumber(bottom.length) + "下");
						game.log(player, "将" + get.cnNumber(top.length) + "张牌置于牌堆顶");
						game.asyncDelayx();
					},
				},
				ice: {
					trigger: {
						player: 'useCardToPlayered'
					},
					forced: true,
					silent: true,
					lastDo: true,
					filter(event, player) {
						return player.gs_hasBuff('ice') && event.targets.length == 1 && get.tag(event.card, 'damage') > 0
					},
					async content(event, trigger, player) {
						game.log(player, '触发', get.gs_colorText('ice', '粉碎之冰'))
						const result = await player.judge(get.gs_colorText('ice', '粉碎之冰'), (card) => {
							if (get.color(card) == 'balck') return get.effect(trigger.target, { name: 'guohe' }, player, player);
							if (get.suit(card) == 'spade') return get.effect(trigger.target, { name: trigger.card.name }, player, player);
							return 0
						}).forResult();
						if (result.color == 'black' && event.target.countDiscardableCards(player, 'he')) {
							await player.discardPlayerCard(event.target, 'he', true)
						}
						if (result.suit == 'spade') {
							if (typeof trigger.getParent().baseDamage != "number") {
								trigger.getParent().baseDamage = 0;
							}
							trigger.getParent().baseDamage++;
						}
					},
				},
				rock: {
					enable: ["chooseToUse", "chooseToRespond"],
					filter(event, player) {
						if (!player.gs_hasBuff('rock')) return false;
						if (player.getRoundHistory('useCard', (evt) => evt.skill == '_gs_buff_rock_backup').length > 0 ||
							player.getRoundHistory('respond', (evt) => evt.skill == '_gs_buff_rock_backup').length > 0) return false;
						return player.getExpansions('bhhudun').some(card => event.filterCard(card, player, event));
					},
					hiddenCard(player, name) {
						if (!player.gs_hasBuff('rock')) return false;
						return player.getExpansions('xtqiongyu').some(card => card.name == name)
					},
					chooseButton: {
						dialog(event, player) {
							return ui.create.dialog(get.gs_colorText('rock', '坚定之岩'), player.getExpansions('bhhudun'), 'hidden');
						},
						check(button) {
							if (_status.event.getParent().type != "phase") return 1;
							return _status.event.player.getUseValue(button.link);
						},
						filter(button, player) {
							var evt = _status.event.getParent();
							return evt.filterCard(button.link, player, evt);
						},
						backup(links, player) {
							return {
								cards: links,
								filterCard: () => false,
								position: 'x',
								selectCard: -1,
								viewAs: links[0],
								async precontent(event, trigger, player) {
									game.log(player, '发动', get.gs_colorText('rock', '坚定之岩'))
									const cards = lib.skill._gs_buff_rock_backup.cards;
									event.result.card = cards[0];
									event.result.cards = cards;
								},
							};
						},
						prompt(links, player) {
							return '选择盾（' + get.translation(links) + '）的目标';
						},
					},
				},
			},
		},
	}
	Object.assign(lib.skill, skill)
	///——————————————————————————————————————————————————————————————函数
	/**由系统操作的事件 */
	Object.assign(game, {
		/**设置卡牌/事件的元素
		 * -注意，元素会直接取代原有属性，无论是否addElement
		 * @param { Card | Event } item 卡牌/事件
		 * @param { gs_element | [gs_element] |  {gs_element: Number} } elementObj 数组和单元素只能附加一层，附加多层请使用对象
		 * @param { Boolean } addElement 保留旧元素？
		 * @returns 
		 */
		setElement(item, elementObj = {}, addElement = false) {
			if (typeof elementObj == 'string') {
				const temp = {};
				temp[elementObj] = 1;
				elementObj = temp;
			} else if (Array.isArray(elementObj)) {
				const temp = {};
				elementObj.forEach(element => temp[element] = 1)
				elementObj = temp;
			} else if (get.is.object(elementObj)) { }
			//如果是增加，额外把原有的补
			if (addElement && get.is.object(item.elementObj)) {
				for (const element in item.elementObj) {
					if (!elementObj[element]) elementObj[element] = 0;
					elementObj[element] += item.elementObj[element];
				}
			}
			if (Object.keys(elementObj).length > 0) {
				item.elementObj = elementObj;
				item.nature = Object.keys(elementObj).join(lib.natureSeparator)
			} else {
				delete item.elementObj;
			}
			return item.elementObj;
		}
	})
	/**检测事物的属性 */
	Object.assign(get.is, {
		/**检测这玩意是个元素
		 * @param { gs_element } element 元素
		 * @returns { Boolean }
		 */
		gs_element(element) { return get.gs_elements().includes(element) },
	})
	/**获取事物的属性 */
	Object.assign(get, {
		/**检测元素的级别，用于判断查找参加反应的元素在lib.gs.reactionOrder中的位置
		 * @typedef { 'fire' | 'water' | 'wind' | 'thunder' | 'grass' | 'ice' | 'rock' | 'fire_grass' | 'thunder_grass' | 'water_ice' | 'water_grass' } gs_element
		* @typedef { '蒸发' | '融化' | '碎冰' | '超激化' | '蔓激化' | '扩散' | '超载' | '感电' | '超导' | '烈绽放' | '超绽放' | '燃烧' | '结晶' | '原绽放' | '冻结' | '原激化' } gs_type
		 * @param { gs_element } element 属性
		 * @returns { '1' | '2' | undefined }
		 */
		gs_level(element) {
			if (['fire', 'water', 'wind', 'thunder', 'grass', 'ice', 'rock'].includes(element)) return 1;
			if (['fire_grass', 'thunder_grass', 'water_ice', 'water_grass'].includes(element)) return 2;
			return undefined
		},
		/**获取库元素的浅拷贝(有序)
		 * @returns { [gs_element] }
		 */
		gs_elements() { return lib.gs.elementOrder.slice(0) },
		/**获取输入中可能进行的反应
		 * - 仅当下，无序，无重复
		 * - 拆散所有输入为元素，得到合法元素，然后输出结果
		 * @param { gs_name | 'gs_element|gs_element' | [gs_element] } element 反应名 参与元素 参与元素组
		 * @param { Boolean } toType 默认输出['fire|water']，选true输出反应类型 ['蒸发']
		 * @returns { [String] }
		 * @example
		 * get.gs_reactionList('abc') = get.gs_reactionList('abc|abc') = []//不合法输出[]
		 * get.gs_reactionList('water|fire') = ['fire|water']//输入无序，也得到有序反应名
		 * get.gs_reactionList(['fire', 'water']) = ['fire|water']//数组
		 * get.gs_reactionList(['fire', 'water','abc']) = ['fire|water']//无视其中的不合法元素
		 * get.gs_reactionList(['fire', 'water', 'fire|ice']) = ['fire|water', 'fire|ice', 'water|ice']//多元素得到所有反应
		 * get.gs_reactionList('fire|water', true) = ['超载']//得到类型
		 * get.gs_reactionList(['fire', 'water', 'ice'], true) = ['蒸发', '融化', '冻结']//多元素得到所有反应类型
		 * get.gs_reactionList(['fire', 'water', 'fire_grass'], true) = ['燃烧', '融化']//无重复结果
		 */
		gs_reactionList(element, toType) {
			let elements = []; const result = [];
			//拆分输入
			if (typeof element == 'string') elements = element.split(lib.natureSeparator);
			else if (Array.isArray(element)) {
				element.forEach(sub => {
					elements.addArray(sub.split(lib.natureSeparator))
				})
			}
			//找到合法元素，并排序，有利于后续生成反应名
			elements = elements.filter(i => get.is.gs_element(i)).sort(lib.sort.nature);
			//只要有至少两个元素
			while (elements.length > 1) {
				const first = elements.shift();
				for (const second of elements) {
					//first分别和其他元素两两组合，形成可能存在的反应名
					let gs_name = first + lib.natureSeparator + second;
					//遍历反应表，得到符合要求的结果
					lib.gs.reactionList.get(first).forEach(type_reaction => {
						if (type_reaction[1] == gs_name) result.add(type_reaction[toType ? 0 : 1])
					})
				}
			}
			return result;
		},
		/**返回特定元素对应的彩色字符串
		 * @param { gs_element } element 一个属性
		 * @param { String } str 被改色的字符
		 * @returns { String }
		 */
		gs_colorText(element, str) {
			const colorList = lib.lineColor.get(element);
			if (!colorList) return '⁂⁂'
			const style = `style = "color: rgb(${colorList[0]}, ${colorList[1]}, ${colorList[2]}); "`;
			if (typeof str == 'string') return `<span ${style}>${str}</span>`
			return style;
		},
	})
	/**临时插入常量 */
	Object.assign(lib.gs, {
		/**元素触发的cost
		 * 输入：gs_name，返回实际消耗elementObj
		 */
		reactionCost: {
			//增幅
			async 蒸发(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 融化(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 超激化(event, trigger, player) {
				event.result = { bool: false }
				if (!event.elementObj) event.elementObj = { thunder: player.gs_countElement('thunder') }
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 蔓激化(event, trigger, player) {
				event.result = { bool: false }
				if (!event.elementObj) event.elementObj = { grass: player.gs_countElement('grass') }
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			//剧变
			async 扩散(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 超载(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 感电(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					if (player.gs_countElement(elements[0]) < player.gs_countElement(elements[1])) {
						event.elementObj[elements[0]] = player.gs_countElement(elements[0])
						event.elementObj[elements[1]] = player.gs_countElement(elements[1]) - 1
					} else if (player.gs_countElement(elements[0]) > player.gs_countElement(elements[1])) {
						event.elementObj[elements[0]] = player.gs_countElement(elements[0]) - 1
						event.elementObj[elements[1]] = player.gs_countElement(elements[1])
					} else {
						let a = [0, 1].randomGet()
						event.elementObj[elements[0]] = player.gs_countElement(elements[a]) - a
						event.elementObj[elements[1]] = player.gs_countElement(elements[1]) - (1 - a)
					}
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 超导(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 烈绽放(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 超绽放(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			//特殊
			async 燃烧(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 结晶(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 原绽放(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 冻结(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
			async 原激化(event, trigger, player) {
				event.result = { bool: false }
				const elements = event.name.slice(0, -5).split(lib.natureSeparator);
				if (!event.elementObj) {
					event.elementObj = {}
					event.elementObj[elements[0]] = player.gs_countElement(elements[0])
					event.elementObj[elements[1]] = player.gs_countElement(elements[1])
				}
				event.result = await player.removeElement(event.elementObj, event.source, event.toTrigger).forResult();
				await event.trigger(event.name);
			},
		},
		/**元素触发的content */
		reactionContent: {
			//增幅
			async 蒸发(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					if (event.toTrigger.name == 'damage' &&
						(event.toTrigger.nature?.includes('fire') || event.toTrigger?.nature.includes('water'))) {
						event.toTrigger.num += Math.min(2, event.toTrigger.num)
					}
					const result = await player.judge(result => result.color == 'red' ? 1 : 0).forResult();
					if (result.color == 'red') {
						await player.gain(result.card, 'gain2')
					}
				}
				await event.trigger(event.name);
			},
			async 融化(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;
				while (effectCount > 0) {
					effectCount--;
					if (event.toTrigger.name == 'damage' &&
						(event.toTrigger.nature?.includes('fire') || event.toTrigger.nature?.includes('ice'))) {
						event.toTrigger.num += Math.min(2, event.toTrigger.num)
					}
					const result = await player.judge(result => result.color == 'black' ? 1 : 0).forResult();
					if (result.color == 'black') {
						await player.gain(result.card, 'gain2')
					}
				}
				await event.trigger(event.name);
			},
			async 超激化(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;
				while (effectCount > 0) {
					effectCount--;
					if (event.toTrigger.name == 'damage' && event.toTrigger.nature?.includes('thunder')) {
						event.toTrigger.num++
					}
					await event.source?.viewHandcards(player);
					await player.draw()
				}
				await event.trigger(event.name);
			},
			async 蔓激化(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;
				while (effectCount > 0) {
					effectCount--;
					if (event.toTrigger.name == 'damage' && event.toTrigger.nature?.includes('grass')) {
						event.toTrigger.num++
					}
					await event.source?.viewHandcards(player);
					await player.draw()
				}
				await event.trigger(event.name);
			},
			//剧变
			async 扩散(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const elements = event.name.split(lib.natureSeparator);
				const map = {
					fire: 'fire',
					water: 'water',
					thunder: 'thunder',
					ice: 'ice',
					fire_grass: 'fire',
					water_ice: 'ice',
				};
				const element = map[elements[0] == 'wind' ? elements[1] : elements[0]]
				while (effectCount > 0) {
					effectCount--;
					const players = game.filterPlayer(i => get.distance(i, player) <= 1 && i != player);
					player.line(players, element)
					for (let current of players) {
						await current.gainElement(element, player, event.toTrigger)
					}
				}
				await event.trigger(event.name);
			},
			async 超载(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const damageNum = (event.source == player ? 0 : event.baseDamage ?? 1) + (event.extraDamage ?? 0);//伤害值
				while (effectCount > 0) {
					effectCount--;
					if (player.countCards('h') > 0) {
						const card = player.getCards('h').randomGet();
						await player.discard(card);
						if (get.color(card) == 'black') await player.damage(damageNum, 'fire', event.source);
					} else {
						await player.damage(damageNum, 'fire', event.source);
					}
				}
				await event.trigger(event.name);
			},
			async 感电(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const damageNum = (event.source == player ? 0 : event.baseDamage ?? 1) + (event.extraDamage ?? 0);//伤害值
				while (effectCount > 0) {
					effectCount--;
					if (player.isLinked()) {
						await player.damage(damageNum, 'thunder', event.source)
					} else await player.link(true)
				}
				await event.trigger(event.name);
			},
			async 超导(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const damageNum = (event.source == player ? 0 : event.baseDamage ?? 1) + (event.extraDamage ?? 0);//伤害值
				while (effectCount > 0) {
					effectCount--;
					if (player.countCards('ej')) {
						await player.discard(player.getCards('ej').randomGet())
					} else {
						await player.damage(damageNum, 'ice', event.source)
					}
				}
				await event.trigger(event.name);
			},
			async 烈绽放(event, trigger, player) {
				if (event.source == player) event.baseDamage = 0;
				if (!event.elementObj?.water_grass > 0) { event.finish(); return; }
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const damageNum = Math.min(2, event.elementObj.water_grass) + event.baseDamage + event.extraDamage;//伤害值
				while (effectCount > 0) {
					effectCount--;
					const players = game.filterPlayer(i => get.distance(i, player) <= 1);
					for (const current of players) {
						await current.damage('grass', damageNum, event.source);
						await current.draw(damageNum)
					}
				}
				await event.trigger(event.name);
			},
			async 超绽放(event, trigger, player) {
				if (event.source == player) event.baseDamage = 0;
				//cost
				if (!event.elementObj?.water_grass > 0) { event.finish(); return; }
				//content
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				const damageNum = Math.min(2, event.elementObj.water_grass) + event.baseDamage + event.extraDamage;//伤害值
				while (effectCount > 0) {
					effectCount--;
					await player.damage('grass', damageNum * 2, event.source);
					await player.draw(damageNum * 2)
				}
				await event.trigger(event.name);
			},
			//特殊
			async 燃烧(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					event.result = { fire_grass: 2 }
				}
				await event.trigger(event.name);
			},
			async 结晶(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					const user = event.source?.isIn() ? event.source : player;
					if (user) {
						if (user == player) {
							await player.gainHudun(get.cards(2), player);
						} else {
							const bool = await user
								.chooseBool('令自己，或点取消令' + get.translation(player) + '获得两张“盾”')
								.set('ai', () => {
									return true
								})
								.forResultBool();
							if (bool) {
								await user.gainHudun(get.cards(2), user);
							} else {
								await player.gainHudun(get.cards(2), player);
							}
						}
					}
				}
				await event.trigger(event.name);
			},
			async 原绽放(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					event.result = { water_grass: 1 }
				}
				await event.trigger(event.name);
			},
			async 冻结(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					event.result = { water_ice: 1 }
				}
				await event.trigger(event.name);
			},
			async 原激化(event, trigger, player) {
				let effectCount = event.effectCount ?? 1;//结算次数默认1
				while (effectCount > 0) {
					effectCount--;
					event.result = { thunder_grass: 1 }
				}
				await event.trigger(event.name);
			},
		},
	})
	/**角色函数和事件 */
	Object.assign(lib.element.player, {
		/**角色的元素
		 * - 可以空调用一次，用来初始化角色的元素附着
		 * @param { undefined | 'num' | 'time' | 'map' } [type] 返回类型
		 * @returns { {gs_element : {time: Number, num: Number }} | { gs_element: Number } | { time: Number } | Map<gs_element, Player[]> }
		 * @example
		 * get.gs_getElement('num')=>{ gs_element: Number,...}
		 * get.gs_getElement('time')=>{ gs_element: Number,... }
		 * get.gs_getElement('map')=>Map<gs_element, {num: Number, time: Number}>
		 * 默认返回：player.gs_element = {
		 *     fire: {
		 *         num: 3,//层数
		 *         time: 9,//持续值
		 *     },
		 * }
		 */
		gs_getElement(type) {
			if (typeof this.gs_element != 'object') this.gs_element = {};
			for (const element in this.gs_element) {
				if (this.gs_element[element]) {
					if (!this.gs_element[element]?.num > 0) delete this.gs_element[element];
					else if (!this.gs_element[element]?.time > 0) this.gs_element[element].time = 0;
				}
			}
			if (!type) return this.gs_element;
			switch (type) {
				case 'map': {
					const map = new Map();
					get.gs_elements().forEach(element => {
						if (this.gs_element[element]?.num != undefined) map.set(element, this.gs_element[element])
					});
					return map;
				}
				case 'num': {
					const num = {};
					for (const element in this.gs_element) {
						if (this.gs_element[element]?.num != undefined) num[element] = this.gs_element[element].num;
					}
					return num;
				}
				case 'time': {
					const time = {};
					for (const element in this.gs_element) {
						if (this.gs_element[element]?.time != undefined) time[element] = this.gs_element[element].time;
					}
					return time;
				}
				default: {
					return this.gs_element;
				}
			}
		},
		/**统计角色的某元素附着量
		 * @param { gs_element } element 
		 * @returns { Number }
		 * @example
		 * get.gs_countFuzhuo() => 0
		 * get.gs_countFuzhuo('xxx') => 0
		 */
		gs_countElement(element) {
			if (typeof element != 'string') return 0;
			if (!get.is.gs_element(element)) return 0;
			return this.gs_getElement()[element]?.num || 0;
		},
		/**角色拥有某元素的附着
		 * @param { gs_element } element 
		 * @returns { Boolean }
		 * @example
		 * get.gs_hasElement(undefined) => true
		 */
		gs_hasElement(element) {
			if (element == undefined) return true;
			return this.gs_countElement(element) > 0;
		},
		/**角色层数大于0的元素组（有序）
		 * @returns { [gs_element] }
		 */
		gs_getElementList() {
			return get.gs_elements().filter(element => this.gs_hasElement(element))
		},
		/**判断玩家是否有一类元素共鸣
		 * @param { gs_element } element 元素
		 * @returns { Boolean }
		 */
		gs_hasBuff(element) {
			if (!get.is.gs_element(element)) return false;
			switch (element) {
				case 'rock': {
					if (!this.getExpansions('bhhudun').length > 0) return false;
					return game.countPlayer(i => i.getExpansions('bhhudun').length > 0) > 1;
				}
				case 'wind': {
					const elements = get.gs_elements().filter(i => i != 'wind');
					const bool = function (current) {
						if (current.getExpansions('bhhudun').length > 0) return false;
						if (elements.some(element => current.gs_hasElement(element))) return false;
						return true;
					}
					if (!bool(this)) return false;
					return game.countPlayer(current => bool(current)) > 1;
				}
				default: {
					if (!this.gs_hasElement(element).length > 0) return false;
					return game.countPlayer(current => current.gs_hasElement(element)) > 1;
				}
			}
		},
		/**返回角色使用伤害牌的次数上限
		 * 通过player.gs_countUsed参数进行设定
		 */
		gs_countUsed() {
			let num = 2;
			if (typeof this.gs_countUsed == 'number') num = player.gs_countUsed;
			if (this.gs_hasElement('fire')) num += 2;
			return num;
		},
		/**刷新一下元素显示
		 */
		$syncElement() {
			if (this.gs_getElementList().length > 0) this.markSkill('gs_element');
			else this.unmarkSkill('gs_element');
			if (this.gs_hasElement('water_ice')) this.$hyyzBuff_dongjie(true);
			else this.$hyyzBuff_dongjie(false);

			if (!this.elementBox) this.elementBox = ui.create.div('.element', this);
			if (!this.elementLogo) this.elementLogo = ui.create.div('.element2', this.elementBox);
			const element = this.gs_getElementList(),
				/**武将牌的宽度
				 * - 单将是自身宽度
				 * - 双将就是两倍的单将宽
				 * - 120
				 */
				width = this.node.avatar.offsetWidth * (this.name2 ? 2 : 1),
				/**武将牌的高度
				 * 180
				 */
				height = this.node.avatar.offsetHeight,
				/**每个小logo的宽度
				 * - 大概是武将宽度的20%左右
				 * - 24
				 */
				logo_short = 0.2 * width,
				logo_long = element.length * 1.02 * logo_short
			//总位置坐标+选项换坐标，往下往右是正
			let ally, allx, map_y, map_x;
			switch (lib.config['extension_原杀_elementPosition']) {//弱点大致位置
				//横向
				case 'top': if (!map_y) map_y = {
					in: 6,
					on: -(logo_short / 2),//往上一半
					out: -(logo_short + 6),//往上一半+6
				}
				case 'bottom': {
					if (!map_y) map_y = {
						in: height - (logo_short + 6),
						on: height - (logo_short / 2),
						out: height + 6,
					}
					ally = map_y[lib.config['extension_原杀_elementPosition2']]//弱点内外微调
					allx = (width - logo_long) / 2
					break;
				}
				//纵向
				case 'left': if (!map_x) map_x = {
					in: 6,//右6
					on: -(logo_short / 2),
					out: -(logo_short + 6),
				}
				case 'right': {
					if (!map_x) map_x = {
						in: width - (logo_short + 6),
						on: width - (logo_short / 2),
						out: width + 6,
					}
					ally = (height - logo_long) / 2
					allx = map_x[lib.config['extension_原杀_elementPosition2']]//弱点内外微调
					break;
				}
			}
			this.elementBox.style.top = ally + 'px'
			this.elementBox.style.left = allx + 'px'
			/**确定一下相对武将牌坐标原点的铺开方向
			 * 上下放置，则横向铺开left
			 * 左右放置，则纵向铺开top
			 */
			const center = ['top', 'bottom'].includes(lib.config['extension_原杀_elementPosition']) ? 'left' : 'top'
			let image = '';
			for (let count = 0; count < element.length; count++) {
				//logo距离原点的距离（前x个的宽度+前x+1个间隔）：[]x[]x[]X
				image += `<img style = 'position: absolute; width: ${logo_short}px; ${center}: ${count * logo_short + (count + 1) * 0.02 * logo_short}px;'`
				image += `src= '${lib.assetURL}extension/原杀/other/image/${element[count]}.png'>`//图片
			}
			this.elementLogo.innerHTML = image;
			ui.updatem(this);
		},
		///——————————————————————————————————————————————————————————————事件
		/**elementObj是gainElement/removeElement/reaction/'fire|thunder'这四种事件的固有属性 */
		/**组元素附着
		 * 参数 elementObj number source toTrigger
		 * - elementObj——元素——数组|单元素|对象
		 * - number = 1——层数——elementObj是单元素或数组的情况下，统一层数
		 * - source ——来源——写'nosource'强制无来源，否则读取_status.event自动识别来源，失败则定为this
		 * - toTrigger = _status.event——源事件——增幅反应改参数、元素系统所依托的那个事件，一般是伤害/使用牌
		 * @returns { GameEventPromise }
		 * @example
		 * player.gainElement(a) //附着a一层
		 * player.gainElement(a,5) //附着a五层
		 * player.gainElement([a,b]) player.gainElement(a,b) //附着a和b各1层
		 * player.gainElement({a:5,b:3},[a,b],2) //附着a五层，b三层
		 */
		gainElement() {
			//输入参数
			let elementObj = {}, source, toTrigger;
			//生成一个自动寻找的源事件
			const evt = _status.event.getParent('damage', true, true) ?? _status.event.getParent('useCard', true, true) ?? _status.event;
			//临时参数
			let number = 1, elements = [], nosource;
			for (let argument of arguments) {
				if (typeof argument == 'number') {
					if (argument > 0) number = argument;
				} else if (typeof argument == 'string') {
					if (argument == 'nosource') nosource = true;
					else elements.add(argument)
				} else if (typeof argument == 'object') {
					if (Array.isArray(argument)) {
						elements.addArray(argument)
					} else if (get.itemtype(argument) == 'player') {
						source = argument
					} else if (get.itemtype(argument) == 'event') {
						toTrigger = argument;
					} else if (get.is.object(argument)) {
						for (let i in argument) {
							elementObj[i] = argument[i]
						}
					}
				}
			}
			//整合元素组
			if (!Object.keys(elementObj).length && elements.length > 0) elements.forEach(i => { elementObj[i] = number })
			//触发
			const next = game.createEvent('gainElement', false);
			next.player = this;//角色
			next.source = nosource ? undefined : (source ?? evt?.source ?? evt?.player ?? this);//优先nosource，自定义>源事件来源>源事件执行者>自己
			next.elementObj = elementObj;//元素对象
			next.toTrigger = toTrigger ?? evt;//源事件
			next.setContent('gainElement');
			return next;
		},
		/**组元素移除
		 * 参数 elementObj number source toTrigger
		 * - elementObj——元素——数组|单元素|对象|'all'，all会全部移除
		 * - number = 1——层数——elementObj是单元素或数组的情况下，统一层数
		 * - source ——来源——写'nosource'强制无来源，否则读取_status.event定为使用牌者，否则定位当前时机者
		 * - toTrigger = _status.event——源事件——增幅反应改参数、元素系统所依托的那个事件，一般是伤害/使用牌
		 * @returns { GameEventPromise }
		 * @example
		 * player.removeElement(a) 移除一层a
		 * player.removeElement(a,3) 移除三层a
		 * player.removeElement([a,b],3) 移除三层a三层b
		 * player.removeElement({a:5,b:3},5,[a,b,c]) a五层，b三层
		 * player.removeElement('all',5) 移除全部
		 */
		removeElement() {
			//输入参数
			let elementObj = {}, source, toTrigger;
			//生成一个自动寻找的源事件
			const evt = _status.event.getParent('damage', true, true) ?? _status.event.getParent('useCard', true, true) ?? _status.event;
			//临时参数
			let number = 1, elements = [], nosource, all;
			for (let argument of arguments) {
				if (typeof argument == 'number') {
					if (argument > 0) number = argument;
				} else if (typeof argument == 'string') {
					if (argument == 'nosource') nosource = true;
					else if (argument == 'all') all = true;
					else elements.add(argument)
				} else if (typeof argument == 'object') {
					if (Array.isArray(argument)) {
						elements.addArray(argument)
					} else if (get.itemtype(argument) == 'player') {
						source = argument
					} else if (get.itemtype(argument) == 'event') {
						toTrigger = argument;
					} else if (get.is.object(argument)) {
						for (let i in argument) {
							elementObj[i] = argument[i]
						}
					}
				}
			}
			//整合元素组
			if (all == true) elementObj = player.gs_getElement('num')
			if (!Object.keys(elementObj).length && elements.length > 0) elements.forEach(i => { elementObj[i] = number })
			//触发
			const next = game.createEvent('removeElement', false);
			next.player = this;//角色
			next.source = nosource ? undefined : (source ?? evt?.source ?? evt?.player ?? this);//优先nosource，自定义>源事件来源>源事件执行者>自己
			next.elementObj = elementObj;//元素对象
			next.toTrigger = toTrigger ?? evt;//自动寻找源事件
			next.setContent('removeElement');
			return next;
		},
		/**组元素反应
		 * player toTrigger source
		 * @returns { GameEventPromise }
		 */
		reactionAuto() {
			let source, toTrigger;
			for (const argument of arguments) {
				if (get.itemtype(argument) == 'event') toTrigger = argument;
				else if (get.itemtype(argument) == 'player') source = argument;
			}
			const next = game.createEvent('reactionAuto', false);
			next.player = this;
			next.toTrigger = toTrigger ?? _status.event;//自定义>当前事件
			next.source = source ?? toTrigger?.source ?? toTrigger?.player ?? this;//自定义>源事件来源>源事件执行者>自己
			next.setContent('reactionAuto')
			return next;
		},
		/**单元素反应
		 * - 因为消耗情况各不相同，因此消耗会写在具体的元素反应事件里面
		 * - gs_name——反应名——字符串，fire|thunder，核心参数，默认消耗通过此名得知
		 * - elemengObj——元素组——元素名和层数组成的对象，默认是undefined。此参数会覆盖默认消耗
		 * - source——来源
		 * - toTrigger——源事件——参数传递_status.event：player.gainElement() => player.reaction() => player['xxx|xxx'] => player.removeElement()
		 * @returns { GameEventPromise }
		 */
		reaction() {
			let gs_name, elementObj, source, toTrigger, unreal;
			const evt = toTrigger ?? _status.event;
			let nosource;
			for (const argument of arguments) {
				if (typeof argument == 'string') {
					if (argument == 'nosource') nosource = true;
					else if (argument == 'unreal') unreal = true;
					else gs_name = argument;
				} else if (typeof argument == 'object') {
					if (get.itemtype(argument) == 'player') {
						source = argument
					} else if (get.itemtype(argument) == 'event') {
						toTrigger = argument
					} else if (get.is.object(argument)) {
						elementObj = argument;
					}
				}
			}
			if (!toTrigger) toTrigger = _status.event;
			if (nosource) {
				source = undefined
			} else if (!source) {
				if (toTrigger?.source) source = toTrigger.source;
				else if (toTrigger?.player) source = toTrigger.player;
				else source = this;
			}
			//触发
			const next = game.createEvent('reaction', false);
			next.player = this//承受者
			next.gs_name = gs_name;//反应名
			next.toTrigger = toTrigger;//当前事件
			next.source = nosource ? undefined : (source ?? evt?.source ?? evt?.player ?? this);//优先nosource，自定义>源事件来源>源事件执行者>自己
			next.source = source;//来源
			//next.unreal = unreal//是否视为反应
			next.elementObj = elementObj
			next.setContent('reaction');
			return next;
		},
		/**改变持续值
		 * @param { gs_element } elements 元素
		 * @param { Number } num 层数
		 * @returns { GameEventPromise }
		 */
		changeTime(element, num = 1) {
			const next = game.createEvent('changeTime', false);
			next.player = this;
			next.element = element;
			next.num = num;
			next.setContent('changeTime');
			return next;
		},
		/**播放冻结动画
		 * @param { Boolean } bool 冻结与否？默认当前water_ice的程度
		 */
		$hyyzBuff_dongjie(bool) {
			if (bool == undefined) bool = Boolean(this.gs_hasElement('water_ice'));
			if (!this.node.hyyzBuff_dongjie) {
				this.node.hyyzBuff_dongjie = ui.create.div('.hyyzBuff-dongjie', this);
				this.classList.toggle('hyyzBuff_dongjie', false);
			}
			this.classList.toggle('hyyzBuff_dongjie', bool);
			game.broadcast((player, bool) => { player.classList.toggle('hyyzBuff_dongjie', bool) }, this, bool);
			ui.updatem(this);
		}
	})
	/**角色事件的执行 */
	Object.assign(lib.element.content, {
		// 组元素附着 player,source,elementObj,toTrigger
		async gainElement(event, trigger, player) {
			player.gs_getElement();
			await event.trigger('gainElementBefore');
			event.result = { bool: false }
			if (!Object.keys(event.elementObj).length > 0) { event.finish(); return; }//有元素才继续执行
			///多元素附着前
			await event.trigger('gainElementBegin');
			for (const element of get.gs_elements()) {
				if (!event.elementObj[element] > 0) continue;//不合法跳出
				if (element) {
					//单元素附着
					const next = game.createEvent("gainElementTo", false);
					next.player = player;
					next.source = event.source;
					next.element = element;
					next.num = event.elementObj[element];
					next.toTrigger = event.toTrigger
					next.setContent('gainElementTo');
					const result = await next.forResult();
					if (result.bool) {
						event.result.bool = true;
						if (!event.result.elementObj) event.result.elementObj = {};
						event.result.elementObj[result.element] = result.num
					}
				}
			}
			//多元素附着后
			if (event.result.bool) {
				let str = (event.source && event.source != player ? `<span class="bluetext">${get.translation(event.source)}</span>令` : ``) +
					`<span class="bluetext">${get.translation(player)}</span>附着`
				for (const element in event.result.elementObj) {
					str += `${event.result.elementObj[element]}${get.gs_colorText(element, get.translation(element))}`
				}
				str += '元素'
				game.log(str)
				await event.trigger('gainElementEnd');
				await event.trigger('gainElementAfter');
			}
		},
		// 单元素附着 player source element num toTrigger
		async gainElementTo(event, trigger, player) {
			event.result = { bool: false }
			//单元素附着时
			event.trigger('gainElementToBegin');
			if (!event.num > 0 || !get.is.gs_element(event.element)) { event.finish(); return; }
			if (player.gs_hasElement(event.element)) {
				const num = Math.min(4 - player.gs_countElement(event.element), event.num);
				if (num > 0) {
					player.gs_element[event.element].num += num;
					player.gs_element[event.element].time = game.players.length + 1;
					player.$syncElement();
					event.result = {
						bool: true,
						element: event.element,
						num: num,
					}
				}
				///单元素附着后
				await event.trigger('gainElementToEnd')
				await event.trigger('gainElementToAfter')
			} else if (!player.gs_hasElement(event.element)) {
				const num = Math.min(4, event.num);
				player.gs_element[event.element] = {
					num: num,
					time: game.players.length + 1
				}
				player.$syncElement();
				event.result = {
					bool: true,
					element: event.element,
					num: num,
				}
				///单元素附着后
				await event.trigger('gainElementToEnd')
				await event.trigger('gainElementToAfter')
			}
		},
		// 组元素移除 player,source,elementObj,toTrigger
		async removeElement(event, trigger, player) {
			player.gs_getElement();
			event.result = { bool: false }
			if (!Object.keys(event.elementObj).length > 0) { event.finish(); return; }//有元素才继续执行
			///多元素移除前
			await event.trigger('removeElementBefore');
			await event.trigger('removeElementBegin');
			for (const element of get.gs_elements()) {
				if (!event.elementObj[element] > 0) continue;//不合法跳出
				if (element) {
					//单元素移除
					const next = game.createEvent("removeElementTo", false);
					next.player = player;
					next.source = event.source;
					next.element = element;
					next.num = event.elementObj[element];
					next.toTrigger = event.toTrigger
					next.setContent('removeElementTo');
					const result = await next.forResult();
					if (result.bool) {
						event.result.bool = true;
						if (!event.result.elementObj) event.result.elementObj = {};
						event.result.elementObj[result.element] = result.num
					}
				}
			}
			///多元素移除后
			if (event.result.bool) {
				let str = (event.source && event.source != player ? `<span class="bluetext">${get.translation(event.source)}</span>令` : ``) +
					`<span class="bluetext">${get.translation(player)}</span>移除`
				for (const element in event.result.elementObj) {
					str += `${event.result.elementObj[element]}${get.gs_colorText(element, get.translation(element))}`
				}
				str += '元素'
				game.log(str)
				await event.trigger('removeElementEnd');
				await event.trigger('removeElementAfter');
			}
		},
		// 单元素移除 player source element num toTrigger
		async removeElementTo(event, trigger, player) {
			event.result = { bool: false }
			//单元素移除时
			event.trigger('removeElementToBegin');
			if (!event.num > 0 || !player.gs_hasElement(event.element)) { event.finish(); return; }
			const num = Math.min(player.gs_countElement(event.element), event.num);
			if (num > 0) {
				player.gs_element[event.element].num -= num;
				if (player.gs_element[event.element].num <= 0) delete player.gs_element[event.element]
				player.$syncElement();
				event.result = {
					bool: true,
					element: event.element,
					num: num,
				}
				///单元素移除后
				await event.trigger('removeElementToEnd')
				await event.trigger('removeElementToAfter')
			}
		},
		// 组元素反应 （反应7次）
		async reactionAuto(event, trigger, player) {
			event.result = { bool: false };
			await event.trigger('reactionAutoBefore')
			await event.trigger('reactionAutoBegin')
			/**结束时将要附着的元素 */
			const productObj = {};
			let count = 20;
			const elemengList = player.gs_getElementList();
			//列表反复遍历，直到达到次数上限或不能反应
			while (count > 0 && get.gs_reactionList(elemengList, true).length > 0) {
				//遍历元素优先级+反应优先级
				for (const first of elemengList) {
					count--//outerLoop:
					if (player.gs_hasElement(first))
						for (const second of lib.gs.reactionOrder.get(first).filter(i => player.gs_hasElement(i))) {
							//获取反应的结果
							const gs_name = get.gs_reactionList([first, second])[0]
							if (gs_name) {
								const next = player.reaction(gs_name, event.source, event.toTrigger);
								const result = await next.forResult();
								if (result.bool) {//元素反应必返回true
									event.result.bool = true;
									if (result.productObj) {
										for (let element in result.productObj) {
											if (!productObj[element]) productObj[element] = 0;
											productObj[element] += result.productObj[element];
										}
									}
									//历史记录
									if (!event.result.history) event.result.history = []
									event.result.history.push({
										gs_name: gs_name,
										elementObj: result.elementObj,
										productObj: result.productObj,
									})
									break;
								}
							}
						}
				}
			}
			await player.removeElement({ wind: 100, rock: 100 }, 'nosource', event.toTrigger)
			if (event.result.history?.length > 0) {
				console.log(get.translation(player), '历史记录：', event.result.history);
				await player.gainElement(productObj, event.source, event.toTrigger);
				await event.trigger('reactionAutoEnd')
				await event.trigger('reactionAutoAfter')
			}
		},
		// 单元素反应 player,source,gs_name,elementObj,[effectCount,baseDamage,extraDamage,]toTrigger
		async reaction(event, trigger, player) {
			player.gs_getElement();
			event.result = { bool: false }
			await event.trigger('reactionBefore')
			if (event.gs_name) event.result.gs_name = event.gs_name
			else {
				console.warn(get.translation(this), '在执行reaction(', [event.gs_name, event.elementObj, event.source, event.toTrigger], ')事件时，缺失反应名gs_name');
				event.finish()
				return;
			}
			if (!event.result.elementObj) event.result.elementObj = {};
			const elements = event.gs_name.split(lib.natureSeparator), gs_type = get.gs_reactionList(event.gs_name, true)[0]
			if (elements.length != 2) {
				console.warn(get.translation(this), '在执行reaction()事件解析gs_name', event.gs_name, '时，参与元素长度异常');
				event.finish()
				return;
			}
			if (!lib.gs.reactionContent[gs_type]) {
				console.warn(get.translation(this), '在执行reaction()事件时', gs_type, '是不存在的反应类型');
				event.finish()
				return;
			}
			game.log(player, '触发了', '#r元', '#y素', '#b反', '#g应', '-', get.gs_colorText(elements[0], gs_type[0]), get.gs_colorText(elements[1], gs_type.slice(1)));
			//反应时
			await event.trigger('reactionBegin')
			//生成具体事件
			//cost，返回消耗的元素
			const next_cost = game.createEvent(event.gs_name + '_cost', false);
			next_cost.player = player
			next_cost.source = event.source;
			next_cost.toTrigger = event.toTrigger;
			next_cost.elementObj = event.elementObj;//可能为undefined
			next_cost.setContent(lib.gs.reactionCost[gs_type]);
			const cost_data = await next_cost.forResult(), elementObj = cost_data.elementObj ?? {};
			//content，返回true、生成物product
			const next = game.createEvent(event.gs_name, false);
			next.player = player
			next.source = event.source;
			next.toTrigger = event.toTrigger;
			next.elementObj = cost_data.elementObj;//可能为{}或undefined
			next.setContent(lib.gs.reactionContent[gs_type]);
			const productObj = await next.forResult();//返回值是
			event.result = {
				bool: true,
				elementObj: elementObj,//实际的消耗{元素：num}
				productObj: productObj,//生成物{生成物：num}
			}
			await game.asyncDelayx()
			//反应后
			await event.trigger('reactionEnd')
			await event.trigger('reactionAfter')
		},
		// 改变持续值 player,element,num
		async changeTime(event, trigger, player) {
			player.gs_getElement();
			event.result = { bool: false }
			///改变持续值前
			await event.trigger('changeTimeBefore');
			await event.trigger('changeTimeBegin');
			if (player.gs_hasElement(event.element) && event.num != 0) {
				let old = player.gs_getElement('time')[event.element]
				if (event.num > 0 && old < 4) {
					const change = Math.min(4 - old, event.num - old);
					player.gs_element[event.element].time += change;
					event.result = { bool: true, element: event.element, num: change }
					player.$syncElement();
					///改变持续值
					await event.trigger('changeTimeEnd')
					await event.trigger('changeTimeAfter')
				} else if (event.num < 0 && old > 0) {
					const change = Math.min(old, - event.num);
					player.gs_element[event.element].time -= change;
					event.result = { bool: true, element: event.element, num: -change }
					player.$syncElement();
					///改变持续值
					await event.trigger('changeTimeEnd')
					await event.trigger('changeTimeAfter')
				}
			}
		},
		// 覆盖原函数，来自1.10.17无名杀版本
		async phaseLoop(event, trigger, player) {
			let current = player;
			let num = 1;
			while (current.getSeatNum() == 0) {
				current.setSeatNum(num);
				current = current.next;
				num++;
			}
			while (true) {
				for (let func of lib.onphase) func()
				await event.player.phase();
				await event.trigger('phaseOver')//回合切换时
				if (!game.players.includes(event.player.next)) {
					event.player = game.findNext(event.player.next);
				} else {
					event.player = event.player.next;
				}
			}
		},
	})
}