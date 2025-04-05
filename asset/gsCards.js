'use strict';
import { lib, game, ui, get, ai, _status } from '../../../noname.js';
//技能等相关信息
/** @type { importCardConfig } */
const gsCards = {
	/** @type { importCardConfig['skill'] } */
	card: {
		...{//基本牌
			gs_shi: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				filterTarget: lib.filter.isMe,
				selectTarget: -1,
				async content(event, trigger, player) {
					const cards = get.cards(2), types = []
					event.target.showCards(cards, '因【示】展示');
					cards.forEach(card => {
						if (get.type2(card) != 'basic') types.add(get.type2(card))
					});
					if (cards.length > 0) {
						const control = await player.chooseControl(types).set('prompt', '获得其中的一类非基本牌').forResultControl();
						if (control) {
							await player.gain(cards.filter(card => get.type2(card) == control))
						}
					}
				},
				ai: {
					basic: {
						order: 7,
						useful: (card, i) => {
							return 1.5
						},
						value: (card, player) => {
							return 9.2
						},
					},
					result: {
						target: 1,
					},
					tag: {
						draw: 1.5,
					},
				},
			},
			gs_liao: {
				fullskin: true,
				type: "basic",
				//cardcolor: "red",
				toself: true,
				enable(card, player) {
					return player.isDamaged();
				},
				savable: true,
				selectTarget: -1,
				filterTarget(card, player, target) {
					return target == player && target.isDamaged();
				},
				modTarget(card, player, target) {
					return target.isDamaged();
				},
				content() {
					target.recover();
				},
				ai: {
					basic: {
						order: (card, player) => {
							if (player.hasSkillTag("pretao")) return 9;
							return 2;
						},
						useful: (card, i) => {
							let player = _status.event.player;
							if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player))
								return 2 / (1 + i);
							let fs = game.filterPlayer((current) => {
								return get.attitude(player, current) > 0 && current.hp <= 2;
							}),
								damaged = 0,
								needs = 0;
							fs.forEach((f) => {
								if (f.hp > 3 || !lib.filter.cardSavable(card, player, f)) return;
								if (f.hp > 1) damaged++;
								else needs++;
							});
							if (needs && damaged) return 5 * needs + 3 * damaged;
							if (needs + damaged > 1 || player.hasSkillTag("maixie")) return 8;
							if (player.hp / player.maxHp < 0.7)
								return 7 + Math.abs(player.hp / player.maxHp - 0.5);
							if (needs) return 7;
							if (damaged) return Math.max(3, 7.8 - i);
							return Math.max(1, 7.2 - i);
						},
						value: (card, player) => {
							let fs = game.filterPlayer((current) => {
								return get.attitude(_status.event.player, current) > 0;
							}),
								damaged = 0,
								needs = 0;
							fs.forEach((f) => {
								if (!player.canUse("gs_liao", f)) return;
								if (f.hp <= 1) needs++;
								else if (f.hp == 2) damaged++;
							});
							if ((needs && damaged) || player.hasSkillTag("maixie"))
								return Math.max(9, 5 * needs + 3 * damaged);
							if (needs || damaged > 1) return 8;
							if (damaged) return 7.5;
							return Math.max(5, 9.2 - player.hp);
						},
					},
					result: {
						target: (player, target) => {
							if (target.hasSkillTag("maixie")) return 3;
							return 2;
						},
						target_use: (player, target, card) => {
							let mode = get.mode(),
								gs_liaos = player.getCards(
									"hs",
									(i) =>
										get.name(i) === "gs_liao" &&
										lib.filter.cardEnabled(i, target, "forceEnable")
								);
							if (target !== _status.event.dying) {
								if (
									!player.isPhaseUsing() ||
									player.needsToDiscard(0, (i, player) => {
										return (
											!player.canIgnoreHandcard(i) &&
											gs_liaos.includes(i)
										);
									}) ||
									player.hasSkillTag(
										"nokeep",
										true,
										{
											card: card,
											target: target,
										},
										true
									)
								)
									return 2;
								let min = 8.1 - (4.5 * player.hp) / player.maxHp,
									nd = player.needsToDiscard(0, (i, player) => {
										return (
											!player.canIgnoreHandcard(i) &&
											(gs_liaos.includes(i) || get.value(i) >= min)
										);
									}),
									keep = nd ? 0 : 2;
								if (
									nd > 2 ||
									(gs_liaos.length > 1 && (nd > 1 || (nd && player.hp < 1 + gs_liaos.length))) ||
									(target.identity === "zhu" &&
										(nd || target.hp < 3) &&
										(mode === "identity" || mode === "versus" || mode === "chess")) ||
									!player.hasFriend()
								)
									return 2;
								if (
									game.hasPlayer((current) => {
										return (
											player !== current &&
											current.identity === "zhu" &&
											current.hp < 3 &&
											(mode === "identity" || mode === "versus" || mode === "chess") &&
											get.attitude(player, current) > 0
										);
									})
								)
									keep = 3;
								else if (nd === 2 || player.hp < 2) return 2;
								if (nd === 2 && player.hp <= 1) return 2;
								if (keep === 3) return 0;
								if (gs_liaos.length <= player.hp / 2) keep = 1;
								if (
									keep &&
									game.countPlayer((current) => {
										if (
											player !== current &&
											current.hp < 3 &&
											player.hp > current.hp &&
											get.attitude(player, current) > 2
										) {
											keep += player.hp - current.hp;
											return true;
										}
										return false;
									})
								) {
									if (keep > 2) return 0;
								}
								return 2;
							}
							if (target.isZhu2() || target === game.boss) return 2;
							if (player !== target) {
								if (target.hp < 0 && gs_liaos.length + target.hp <= 0) return 0;
								if (Math.abs(get.attitude(player, target)) < 1) return 0;
							}
							if (!player.getFriends().length) return 2;
							let tri = _status.event.getTrigger(),
								num = game.countPlayer((current) => {
									if (get.attitude(current, target) > 0)
										return current.countCards(
											"hs",
											(i) =>
												get.name(i) === "gs_liao" &&
												lib.filter.cardEnabled(i, target, "forceEnable")
										);
								}),
								dis = 1,
								t = _status.currentPhase || game.me;
							while (t !== target) {
								let att = get.attitude(player, t);
								if (att < -2) dis++;
								else if (att < 1) dis += 0.45;
								t = t.next;
							}
							if (mode === "identity") {
								if (tri && tri.name === "dying") {
									if (target.identity === "fan") {
										if (
											(!tri.source && player !== target) ||
											(tri.source &&
												tri.source !== target &&
												player.getFriends().includes(tri.source.identity))
										) {
											if (
												num > dis ||
												(player === target &&
													player.countCards("hs", { type: "basic" }) > 1.6 * dis)
											)
												return 2;
											return 0;
										}
									} else if (
										tri.source &&
										tri.source.isZhu &&
										(target.identity === "zhong" || target.identity === "mingzhong") &&
										(tri.source.countCards("he") > 2 ||
											(player === tri.source &&
												player.hasCard((i) => i.name !== "gs_liao", "he")))
									)
										return 2;
									//if(player!==target&&!target.isZhu&&target.countCards('hs')<dis) return 0;
								}
								if (player.identity === "zhu") {
									if (
										player.hp <= 1 &&
										player !== target &&
										gs_liaos + player.countCards("hs", "jiu") <=
										Math.min(
											dis,
											game.countPlayer((current) => {
												return current.identity === "fan";
											})
										)
									)
										return 0;
								}
							} else if (
								mode === "stone" &&
								target.isMin() &&
								player !== target &&
								tri &&
								tri.name === "dying" &&
								player.side === target.side &&
								tri.source !== target.getEnemy()
							)
								return 0;
							return 2;
						},
					},
					tag: {
						recover: 1,
						save: 1,
					},
				},
			},
			gs_biao: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				range(card, player, target) {
					return player == target || player.inRange(target);
				},
				filterTarget: true,
				async content(event, trigger, player) {
					const target = event.target, card = event.card
					if (typeof event.shanRequired != "number" || !event.shanRequired || event.shanRequired < 0) {
						event.shanRequired = 1;
					}
					let result;
					while (event.shanRequired > 0) {
						if (event.directHit || event.directHit2) {
							result = { bool: false };
						} else if (event.skipShan) {
							result = { bool: true, result: "shaned" };
						} else {
							var next = target.chooseToUse("请使用一张闪响应飙");
							next.set("type", "respondShan");
							next.set("filterCard", function (card, player) {
								if (get.name(card) != "shan") return false;
								return lib.filter.cardEnabled(card, player, "forceEnable");
							});
							if (event.shanRequired > 1) {
								next.set("prompt2", "（共需使用" + event.shanRequired + "张闪）");
							}
							next.set("ai1", function (card) {
								if (player.isTurnedOver()) return false;
								if (_status.event.useShan) return get.order(card);
								return 0;
							}).set("shanRequired", event.shanRequired);
							next.set("respondTo", [player, card]);
							next.set("useShan", (() => {
								if (target.hasSkillTag("noShan", null, event)) return false;
								if (target.hasSkillTag("useShan", null, event)) return true;
								if (event.shanRequired > 1 &&
									target.mayHaveShan(target, "use", null, "count") < event.shanRequired - (event.shanIgnored || 0)
								) return false;
								return true;
							})()
							);
							result = await next.forResult()
						}
						if (!result || !result.bool || !result.result || result.result != "shaned") {
							event.trigger("biaoHitBegin");
							await event.targets[0].draw(2);
							await event.targets[0].turnOver();
							event.result = { bool: true };
							event.trigger("biaoHitEnd");
							event.finish();
							return;
						} else {
							event.shanRequired--;
						}
					}
					event.result = { bool: false };
					event.responded = result;
					event.trigger("biaoMiss");
				},
				ai: {
					basic: {
						order: 7,
						useful: (card, i) => {
							return 1.5
						},
						value: (card, player) => {
							return 9.2
						},
					},
					result: {
						target(player, target, card) {
							if (target.isTurnedOver()) return 2;
							return -4
						}
					},
					tag: {
						draw: 1.5,
					},
				},
			},
			gs_jiao: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				range(card, player, target) {
					return player.inRange(target);
				},
				filterTarget: true,
				async content(event, trigger, player) {
					await event.target.recover();
					event.target.addTempSkill('gs_jiao_buff', { player: 'phaseBegin' })
				}
			},
		},
		...{//事件牌
			gs_dianshichengjin: {
				fullskin: true,
				type: "trick",
				enable: true,
				filter(event, player) {
					return game.hasPlayer(i => get.distance(player, i) <= 2);
				},
				filterTarget(card, player, target) {
					return get.distance(player, target) <= 2
				},
				modTarget: true,
				async content(event, trigger, player) {
					await event.target.draw()
					const suit = await event.target.judge().forResult('suit');
					if (suit) {
						const map = {
							diamond: 'rock',
							heart: 'water',
							club: 'fire',
							spade: 'wind',
						}
						await event.target.gainElement(map[suit])
					}
				},
				ai: {
					wuxie: function (target, card, player, viewer) {
						if (get.mode() == "guozhan") {
							if (!_status._aozhan) {
								if (!player.isMajor()) {
									if (!viewer.isMajor()) return 0;
								}
							}
						}
					},
					basic: {
						order: 7,
						useful: 4.5,
						value: 9.2,
					},
					result: {
						target(player, target, card) {
							if (!target.gs_getElementList().length) return 0.8
							return -0.2
						}
					},
					tag: {
						draw: 1,

						gs_element: 1,
						rockElement: 0.25,
						waterElement: 0.25,
						fireElement: 0.25,
						windElement: 0.25,
					},
				},
			},
			gs_qvsan: {
				fullskin: true,
				type: "trick",
				enable: true,
				filterTarget: lib.filter.notMe,
				modTarget: true,
				async content(event, trigger, player) {
					event.targets[0].gainElement('wind', player, event);
				},
				ai: {
					basic: {
						order: 10,
						useful: 8,
						value: 1.5
					},
					result: {
						target(player, target, card) {
							if (target.gs_getElementList().some(ele => get.gs_reactionList([ele, 'wind']).length > 0)) {
								return 1
							}
							return 0
						},
					},
					tag: {
						gs_element: 1,
						windElement: 1,
					}
				}
			},
		},
		...{//装备牌
			gs_xifengjian: {//2/9
				//legend: true,
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				skills: ["gs_xifengjian_skill"],
				ai: {
					equipValue(card, player) {
						return 2
					},
					basic: {
						equipValue: 9,
						order: (card, player) => {
							const equipValue = get.equipValue(card, player) / 20;
							return player && player.hasSkillTag('reverseEquip') ? 8.5 - equipValue : 8 + equipValue;
						},
						useful: 8,
						value: (card, player, index, method) => {
							if (!player.getCards('e').includes(card) && !player.canEquip(card, true)) return 0.01;
							const info = get.info(card), current = player.getEquip(info.subtype), value = current && card != current && get.value(current, player);
							let equipValue = info.ai.equipValue || info.ai.basic.equipValue;
							if (typeof equipValue == 'function') {
								if (method == 'raw') return equipValue(card, player);
								if (method == 'raw2') return equipValue(card, player) - value;
								return Math.max(0.1, equipValue(card, player) - value);
							}
							if (typeof equipValue != 'number') equipValue = 0;
							if (method == 'raw') return equipValue;
							if (method == 'raw2') return equipValue - value;
							return Math.max(0.1, equipValue - value);
						},
					},
					result: {
						target: (player, target, card) => get.equipResult(player, target, card.name),
					},
				},
			},

		},
	},
	skill: {
		...{//基本牌
			gs_jiao_buff: {
				charlotte: true,
				equipSkill: true,
				mark: true,
				marktext: '饺',
				intro: {
					name: '饺',
					content: '直到回合开始，你受到的伤害+1。'
				},
				trigger: {
					player: 'damageBegin3',
				},
				forced: true,
				async content(event, trigger, player) {
					game.log(player, '因', { name: 'gs_jiao' }, '此伤害+1')
					trigger.num++;
				},
				ai: {
					effect: {
						target(card, player, target) {
							if (get.tag(card, 'damage') > 0) {
								return [1, -2, 0, 0]
							}
						}
					}
				}
			}
		},
		...{//事件

		},
		...{//装备
			gs_xifengjian_skill: {
				equipSkill: true,
				trigger: {
					source: 'reactionBegin'
				},
				filter(event, player) {
					const evt = event.toTrigger.getParent('useCard', true, true)
					return evt.card.name == 'sha';
				},
				async content(event, trigger, player) {
					player.draw()
				}
			},
		},
	},
	translate: {
		//基本牌
		gs_shi: '示',
		gs_shi_info: '出牌阶段，对自己使用。目标角色亮出牌堆顶两张牌，然后获得其中一类非基本牌。',
		gs_shi_append: '<span class="text" style="font-family: yuanli">你都玩〇神了，你说你不抽卡，我信你个**</span>',
		gs_liao: '疗',
		gs_liao_info: '①出牌阶段，对自己使用，目标角色回复1点体力。②当有角色处于濒死状态时，对该角色使用。目标角色回复1点体力。',
		gs_liao_append: '<span class="text" style="font-family: yuanli">换皮桃，保持画风用的。</span>',
		gs_biao: '飙',
		gs_biao_info: '出牌阶段，对自己或攻击范围内一名角色使用。目标角色摸两张牌并翻面。',
		gs_biao_append: '<span class="text" style="font-family: yuanli">古蒙德有“时之千分”的说法</span>',
		gs_jiao: '饺',
		gs_jiao_info: '出牌阶段，对攻击范围内一名角色使用。目标角色回复1点体力，直到其的回合开始，其受到的伤害+1。',
		gs_jiao_append: '<span class="text" style="font-family: yuanli">好吃不过饺子，好玩不过骄姿</span>',

		gs_dianshichengjin: '点石成金',
		get gs_dianshichengjin_info() {
			return `出牌阶段，对距离2以内的一名其他角色使用。目标角色摸一张牌，然后判定：若结果为${get.gs_colorText('rock', '♦')}/${get.gs_colorText('water', '♥')}/${get.gs_colorText('fire', '♣')}/${get.gs_colorText('wind', '♠')}，令其附着${get.gs_colorText('rock', '岩')}/${get.gs_colorText('water', '水')}/${get.gs_colorText('fire', '火')}/${get.gs_colorText('wind', '风')}元素。`
		},
		gs_dianshichengjin_append: '<span class="text" style="font-family: yuanli">地水火风，领我敕命。</br>再造四大，重铸五行。</span>',//_prefix

		gs_qvsan: '驱散',
		get gs_qvsan_info() {
			return `出牌阶段，对一名其他角色使用。目标角色附着1点${get.gs_colorText('wind', '风')}元素。`
		},
		gs_qvsan_append: '<span class="text" style="font-family: yuanli">你这个驱散，能反制召唤物吗？</span>',
		gs_xifengjian: '西风剑',
		gs_xifengjian_info: '你使用的【杀】触发元素反应时，可以摸一张牌。',
	},
	list: [
		["heart", 1, "gs_shi"],
		["heart", 1, "gs_liao"],
		["heart", 1, "gs_biao"],
		["heart", 1, "gs_jiao"],

		["heart", 1, "gs_dianshichengjin"],
		["heart", 1, "gs_qvsan"],

		["heart", 1, "gs_xifengjian"],
	]
}
for (let name in gsCards.card) {
	if (gsCards.card[name].type != 'equip') continue;
	gsCards.translate[name + '_skill'] = gsCards.translate[name];
	if (gsCards.card[name].enable) continue;
	const 最实用的代码 = {
		enable: true,
		selectTarget: -1,
		filterTarget: (card, player, target) => player == target && target.canEquip(card, true),
		modTarget: true,
		allowMultiple: false,
		content() {
			//不存在处理区外的牌=全部都在处理区
			if (!card?.cards.some(card => get.position(card, true) !== "o")) target.equip(card);
		},
		toself: true,
	}
	Object.assign(gsCards.card[name], 最实用的代码);
}
export { gsCards }

