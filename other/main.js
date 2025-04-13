'use strict';
import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { gsElement } from "./gsElement.js";
/** @type { importExtensionConfig['precontent'] } */
async function PRECONTENT(config) {
	!lib.gs && (lib.gs = {})
	// 加载牌堆和角色
	if (lib.config.gs_forceEnableCard && lib.config.cards) lib.config.cards = ['原杀'];
	if (lib.config.gs_forceEnableCharacter && lib.config.characters) lib.config.characters = ['原杀'];
	//——————————————导入CSS文件——————————————//
	lib.init.css(`${lib.assetURL}extension/原杀/other`, `extension`);
	await gsElement();
	//——————————————导入武将、卡牌——————————————//
	await import('../asset/index.js')
}
async function CONTENT() {
	// 自动开启武将包
	if (!lib.config['extension_原杀_init']) {
		game.saveConfig('extension_原杀_init', true);
		game.saveConfig('characters', lib.config.characters.concat(['gsCharacter']))
		game.saveConfig('cards', lib.config.cards.concat(['gsCard']));
	};
	/** @type { SMap<Skill> } */
	const replace = {
		sha: {
			image: 'ext:原杀/asset/gsCard/image/sha.png',
			audio: true,
			fullskin: true,
			nature: ["thunder", "fire", "kami", "ice"],
			type: "basic",
			enable: true,
			usable: 1,
			updateUsable: "phaseUse",
			global: "icesha_skill",
			range: (card, player, target) => player.inRange(target),
			selectTarget: 1,
			cardPrompt(card) {
				const natures = get.natureList(Array.isArray(card) ? card[3] : card);
				if (lib.translate["sha_nature_" + natures[0] + "_info"])
					return lib.translate["sha_nature_" + natures[0] + "_info"];
				let str = "出牌阶段，对你攻击范围内的一名角色使用。其须使用一张【闪】，";
				if (natures.includes("stab")) {
					str += "且在此之后需弃置一张手牌（没有则不弃），";
				}
				str += "否则你对其造成1点";
				let linked = lib.linked.filter((n) => natures.includes(n));
				if (linked.length) {
					str += (get.colorText(get.nature(linked)) ?? get.translation(get.nature(linked))) + "元素";
				}
				str += "伤害。";
				return str;
			},
			defaultYingbianEffect: "add",
			filterTarget: lib.filter.notMe,
			async content(event, trigger, player) {
				const target = event.targets[0], card = event.card;
				if (!event.shanRequired > 0) event.shanRequired = 1;
				if (typeof event.baseDamage != "number") event.baseDamage = 1;
				if (typeof event.extraDamage != "number") event.extraDamage = 0;
				let result;
				while (event.shanRequired > 0) {
					if (event.directHit || event.directHit2 || (!_status.connectMode && lib.config.skip_shan && !target.hasShan())) {
						result = { bool: false };
					} else if (event.skipShan) {
						result = { bool: true, result: "shaned" };
					} else {
						const next = target.chooseToUse("请使用一张闪响应杀");
						next.set("type", "respondShan");
						next.set("filterCard", function (card, player) {
							if (get.name(card) != "shan") return false;
							return lib.filter.cardEnabled(card, player, "forceEnable");
						});
						if (event.shanRequired > 1) {
							next.set("prompt2", "（共需使用" + event.shanRequired + "张闪）");
						} else if (game.hasNature(event.card, "stab")) {
							next.set("prompt2", "（在此之后仍需弃置一张手牌）");
						}
						next.set("ai1", function (card) {
							if (_status.event.useShan) return get.order(card);
							return 0;
						}).set("shanRequired", event.shanRequired);
						next.set("respondTo", [player, card]);
						next.set("useShan", (() => {
							if (target.hasSkillTag("noShan", null, event)) return false;
							if (target.hasSkillTag("useShan", null, event)) return true;
							if (target.isLinked() &&
								game.hasNature(event.card) &&
								get.attitude(target, player._trueMe || player) > 0
							) return false;
							if (event.baseDamage + event.extraDamage <= 0 && !game.hasNature(event.card, "ice")) return false;
							if (event.baseDamage + event.extraDamage >=
								target.hp + (player.hasSkillTag("jueqing", false, target) || target.hasSkill("gangzhi") ? target.hujia : 0)
							) return true;
							if (!game.hasNature(event.card, "ice") &&
								get.damageEffect(target, player, target, get.nature(event.card)) >= 0) return false;
							if (event.shanRequired > 1 &&
								target.mayHaveShan(target, "use", null, "count") <
								event.shanRequired - (event.shanIgnored || 0)) return false;
							return true;
						})()
						);
						//next.autochoose=lib.filter.autoRespondShan;
						result = await next.forResult();
					}
					if (!result || !result.bool || !result.result || result.result != "shaned") {
						await event.trigger("shaHit");//命中
						if (event.unhurt) {//免伤
							event.result = { bool: false };
							await event.trigger("shaUnhirt");
						} else {
							if (!event.directHit && !event.directHit2 && lib.filter.cardEnabled(new lib.element.VCard({ name: "shan" }), target, "forceEnable") && target.countCards("hs") > 0 && get.damageEffect(target, player, target) < 0) target.addGaintag(target.getCards("hs"), "sha_notshan");

							const next = target.damage(get.nature(event.card));
							if (event.elementObj) game.setElement(next, event.elementObj, true)
							if (card.nature?.length > 0) {
								const up = event.elementObj ? Object.keys(event.elementObj) : [];
								const natures = card.nature.split(lib.natureSeparator).filter(element => !up.includes(element))
								if (natures.length > 0) {
									const elementObj = {}
									natures.forEach(element => elementObj[element] = 1);
									game.setElement(next, elementObj, true)
								}
							}
							await next;

							event.result = { bool: true };
							await event.trigger("shaDamage");
						}
						event.finish();
						return;
					} else {
						event.shanRequired--;
					}
				}
				if (game.hasNature(event.card, "stab") && target.countCards("h") > 0) {
					event.responded = result;
					const result = await target
						.chooseToDiscard("刺杀：请弃置一张牌，否则此【杀】依然造成伤害")
						.set("ai", function (card) {
							var target = _status.event.player;
							var evt = _status.event.getParent();
							var bool = true;
							if (get.damageEffect(target, evt.player, target, evt.card.nature) >= 0)
								bool = false;
							if (bool) {
								return 8 - get.useful(card);
							}
							return 0;
						})
						.forResult();
					if ((!result || !result.bool) && !event.unhurt) {

						const next = target.damage(get.nature(event.card));
						if (event.elementObj) game.setElement(next, event.elementObj, true)
						if (card.nature?.length > 0) {
							const up = event.elementObj ? Object.keys(event.elementObj) : [];
							const natures = card.nature.split(lib.natureSeparator).filter(element => !up.includes(element))
							if (natures.length > 0) {
								const elementObj = {}
								natures.forEach(element => elementObj[element] = 1);
								game.setElement(next, elementObj, true)
							}
						}
						await next;

						event.result = { bool: true };
						await event.trigger("shaDamage");
						event.finish();
						return;
					}
				}
				await event.trigger("shaMiss");
				event.responded = result;
				event.result = { bool: false };
				await event.trigger("shaUnhirt");
			},
			ai: {
				yingbian(card, player, targets, viewer) {
					if (get.attitude(viewer, player) <= 0) return 0;
					var base = 0,
						hit = false;
					if (get.cardtag(card, "yingbian_hit")) {
						hit = true;
						if (targets.some((target) => {
							return (
								target.mayHaveShan(viewer, "use", target.getCards("h", (i) => i.hasGaintag("sha_notshan"))) &&
								get.attitude(viewer, target) < 0 &&
								get.damageEffect(target, player, viewer, get.natureList(card)) > 0
							);
						})) base += 5;
					}
					if (get.cardtag(card, "yingbian_add") && game.hasPlayer(function (current) {
						return (
							!targets.includes(current) &&
							lib.filter.targetEnabled2(card, player, current) &&
							get.effect(current, card, player, player) > 0
						);
					})) base += 5;
					if (get.cardtag(card, "yingbian_damage") && targets.some((target) => {
						return (
							get.attitude(player, target) < 0 &&
							(hit ||
								!target.mayHaveShan(viewer, "use", target.getCards("h", (i) => i.hasGaintag("sha_notshan"))) ||
								player.hasSkillTag("directHit_ai", true, { target: target, card: card, }, true)) &&
							!target.hasSkillTag("filterDamage", null, {
								player: player,
								card: card,
								jiu: true,
							})
						);
					})) base += 5;
					return base;
				},
				canLink(player, target, card) {
					if (!target.isLinked() && !player.hasSkill("wutiesuolian_skill")) return false;
					if (player.hasSkill("jueqing") ||
						player.hasSkill("gangzhi") ||
						target.hasSkill("gangzhi")) return false;
					return true;
				},
				basic: {
					useful: [5, 3, 1],
					value: [5, 3, 1],
				},
				order(item, player) {
					let res = 3.2;
					if (player.hasSkillTag("presha", true, null, true)) res = 10;
					if (typeof item !== "object" ||
						!game.hasNature(item, "linked") ||
						game.countPlayer((cur) => cur.isLinked()) < 2
					) return res;
					//let used = player.getCardUsable('sha') - 1.5, natures = ['thunder', 'fire', 'ice', 'kami'];
					let uv = player.getUseValue(item, true);
					if (uv <= 0) return res;
					let temp = player.getUseValue("sha", true) - uv;
					if (temp < 0) return res + 0.15;
					if (temp > 0) return res - 0.15;
					return res;
				},
				result: {
					target(player, target, card, isLink) {
						let eff = -1.5,
							odds = 1.35,
							num = 1;
						if (isLink) {
							let cache = _status.event.getTempCache("sha_result", "eff");
							if (typeof cache !== "object" || cache.card !== get.translation(card))
								return eff;
							if (cache.odds < 1.35 && cache.bool) return 1.35 * cache.eff;
							return cache.odds * cache.eff;
						}
						if (player.hasSkill("jiu") ||
							player.hasSkillTag("damageBonus", true, { target: target, card: card, })
						) {
							if (target.hasSkillTag("filterDamage", null, { player: player, card: card, jiu: true, })) eff = -0.5;
							else {
								num = 2;
								if (get.attitude(player, target) > 0) eff = -7;
								else eff = -4;
							}
						}
						if (!player.hasSkillTag("directHit_ai", true, { target: target, card: card, }, true)) odds -=
							0.7 * target.mayHaveShan(player, "use", target.getCards("h", (i) => i.hasGaintag("sha_notshan")), "odds");
						_status.event.putTempCache("sha_result", "eff", {
							bool: target.hp > num && get.attitude(player, target) > 0,
							card: get.translation(card),
							eff: eff,
							odds: odds,
						});
						return odds * eff;
					},
				},
				tag: {
					respond: 1,
					respondShan: 1,
					damage(card) {
						if (game.hasNature(card, "poison")) return;
						return 1;
					},
					natureDamage(card) {
						if (game.hasNature(card, "linked")) return 1;
					},
					fireDamage(card, nature) {
						if (game.hasNature(card, "fire")) return 1;
					},
					thunderDamage(card, nature) {
						if (game.hasNature(card, "thunder")) return 1;
					},
					poisonDamage(card, nature) {
						if (game.hasNature(card, "poison")) return 1;
					},
				},
			},
		},
		shan: {
			audio: true,
			image: 'ext:原杀/asset/gsCard/image/shan.png',
			fullskin: true,
			type: "basic",
			cardcolor: "red",
			notarget: true,
			nodelay: true,
			defaultYingbianEffect: "draw",
			async content(event, trigger, player) {
				event.result = "shaned";
				event.getParent().delayx = false;
				await game.asyncDelay(0.5);
			},
			ai: {
				order: 3,
				basic: {
					useful(card, i) {
						let player = _status.event.player, basic = [7, 5.1, 2], num = basic[Math.min(2, i)];
						if (player.hp > 2 && player.hasSkillTag("maixie")) num *= 0.57;
						if (player.hasSkillTag("freeShan", false, null, true) || player.getEquip("rewrite_renwang")) num *= 0.8;
						return num;
					},
					value: [7, 5.1, 2],
				},
				result: { player: 1 },
				//expose:0.2
			},
		}
	}
	Object.assign(lib.card, replace)
	Object.assign(lib.translate, {
		trick: '事件',
		sha: '杀',
		sha_info: '出牌阶段，对你攻击范围内的一名角色使用。其须使用一张【闪】，否则你对其造成1点伤害。',
		sha_append: '<span class=\"text\" style=\"font-family: yuanli\">死</span>',
		shan: '闪',
		shan_info: '基本牌对你生效前，对其使用。抵消其对你的效果。',
		shan_append: '<span class=\"text\" style=\"font-family: yuanli\">空</span>',
	})
	lib.actualCardName.set('Sada Vin Plata', '岩酒盾')
	lib.actualCardName.set('Gusha Vin Plata', '草酒盾')
	lib.actualCardName.set('Lata Vin Plata', '冰酒盾')
	// 势力导入，颜色与元素相同
	game.addGroup('mengde', '蒙德', '蒙德', { color: '#50dfdf' })
	game.addGroup('liyue', '璃月', '璃月', { color: '#ce9c13' })
	game.addGroup('daoqi', '稻妻', '稻妻', { color: '#af00a1' })
	game.addGroup('fengdan', '枫丹', '枫丹', { color: '#0066ff' })
	game.addGroup('xvmi', '须弥', '须弥', { color: '#197c00' })
	game.addGroup('nata', '纳塔', '纳塔', { color: '#ff9244' })
	game.addGroup('zhidong', '至冬', '至冬', { color: '#3b6273' })
}
const CONFIG = {
	splitLine: { clear: true, name: "<hr>" },
	colorText: {
		name: '<span class="bluetext">启用元素发光字体</span>',
		init: true,
		intro: '如果元素的发光字体看不清，可以关闭并显示普通彩色字体',
	},
	elementPosition: {
		name: '<span class="bluetext">元素显示位置</span>',
		init: 'top',
		intro: '元素图标在武将牌附近的显示位置',
		item: {
			'top': '上',
			'bottom': '下',
			'left': '左',
			'right': '右',
		},
		onclick(item) {
			game.saveConfig('extension_原杀_elementPosition', item);
			if (game.countPlayer2() > 0) game.filterPlayer2(i => i.$syncElement())
		}
	},
	elementPosition2: {
		name: '<span class="bluetext">元素内外侧显示位置</span>',
		init: 'out',
		intro: '元素图标在武将牌内外的情况',
		item: {
			'in': '内侧',
			'on': '边缘',
			'out': '外侧',
		},
		onclick(item) {
			game.saveConfig('extension_原杀_elementPosition2', item);
			if (game.countPlayer2() > 0) game.filterPlayer2(i => i.$syncElement())
		}
	},
	splitLine2: { clear: true, name: "<hr>" },
	gs_forceEnableCharacter: {
		name: '仅启用本扩展角色包',
		intro: "开启后，会在游戏加载时强制仅启用本扩展角色包。这一行为会关闭其他角色包，仅保留本扩展角色，用于更好地体验本扩展的元素系统与角色。",
		init: false,
	},
	gs_forceEnableCard: {
		name: '仅启用本扩展卡牌包',
		init: false,
		intro: "开启后，会在游戏加载时强制仅启用本扩展卡牌包。这一行为会关闭其他卡牌包，仅保留本扩展卡牌，用于更好地体验本扩展牌堆。",
	},
	splitLine3: { clear: true, name: "<hr>" },
}
const HELP = (function () {
	let help = {};
	help['<span class="gs_water">元素类型</span>'] =
		`<li>扩展包内有<span style="color: #f007f0">一级元素</span>7种，<span style="color: #07a6f0">二级元素</span>4种。以下元素纵列按<span class='firetext'>元素优先级</span>排列，每个元素后方的横行按该元素的<span class='thundertext'>反应优先级</span>排列，未尽事宜，详看<span style="color:rgb(255, 0, 0)">开发文档</span>：</li>
		
		<b style="color: #f007f0">一级元素</b>：<br>
		<span style="font-size:14px">最基本的元素，可以直接或间接产生所有类型的反应，一般情况下可以被角色赋予附着。</span>
		<ul>
			<li><b class='gs_fire'>火</b>焰：烈绽放，超载，扩散，蒸发，融化，燃烧，燃烧，结晶</li>
			<li><b class='gs_water'>水</b>流：蒸发，扩散，冻结，原绽放，感电，结晶</li>
			<li><b class='gs_wind'>风</b>蚀：扩散</li>
			<li><b class='gs_thunder'>雷</b>电：超绽放，超激化，超载，扩散，感电，超导，原激化，结晶</li>
			<li>蔓<b class='gs_grass'>草</b>：蔓激化，原激化，燃烧，原绽放</li>
			<li>寒<b class='gs_ice'>冰</b>：超导，融化，扩散，冻结，结晶</li>
			<li><b class='gs_rock'>岩</b>珏：结晶</li>
		</ul>
		<b style="color: #07a6f0">二级元素</b>：</br>
		<span style="font-size:14px">一般由一级元素反应生成并附着，本质是元素的近似物。<br>
		部分二级元素拥有与之特性相似的一级元素，可以代替相似的一级元素发生反应，产生的效果与一级元素相同。如扩散：<span class='gs_fire_grass'>燃</span>可以代替<span class='gs_fire'>火</span>与<span class='gs_wind'>风</span>发生扩散反应，并且对附近角色产生<span class='gs_fire'>火</span>附着。</span>
		<ul>
			<li><b class='gs_fire_grass'>燃</b>：烈绽放，超载，扩散，蒸发，融化，结晶</li>
			<li>因衰减减少元素量后，随机展示一张手牌并抉择：使用之；受到1点火焰伤害。</li>
			<li><b class='gs_thunder_grass'>激</b>：蔓激化，超激化，燃烧，原绽放</li>
			<li>无效果</li>
			<li><b class='gs_water_ice'>冻</b>：超导，融化，扩散，结晶</li>
			<li>每回合仅能使用或打出一张手牌，且受到火焰伤害或不小于2点的物理伤害的值+1。</li>
			<li><b class='gs_water_grass'>核</b>：超绽放，烈绽放</li>
			<li>因衰减减少元素量后，受到1点蔓草伤害</li>
		</ul>`;
	help['<span class="gs_water">元素反应</span>'] =
		`<li>在元素类型一栏中出现了多种<span style="color: #07a6f0">元素反应</span>，未尽事宜，详看<span style="color:rgb(255, 0, 0)">开发文档</span>。以下反应不分优先级：</li>

		<b>增幅反应</b>：<br>
		<span style="font-size:14px">能够修改导致此反应触发的伤害事件的伤害值</span>
		<ul>
			<li><b class='gs_fire'>蒸</b><b class='gs_water'>发</b>：消耗所有火（燃）元素和水元素，令本次水流或火焰伤害翻倍（至多+2），然后进行判定，若结果为红色，获得判定牌。</li>
			<li><b class='gs_fire'>融</b><b class='gs_ice'>化</b>：消耗所有火（燃）元素和冰（冻）元素，令本次寒冰或火焰伤害翻倍（至多+2），然后进行判定，若结果为黑色，获得判定牌。</li>
			<li><b class='gs_thunder'>超</b><b class='gs_grass'>激化</b>：消耗所有雷元素，令本次雷电伤害+1，然后触发者观看承受者的手牌后，承受者摸一张牌。</li>
			<li><b class='gs_grass'>蔓</b><b class='gs_thunder_grass'>激化</b>：消耗所有草元素，令本次蔓草伤害+1，然后触发者观看承受者的手牌后，承受者摸一张牌。</li>
		</ul>

		<b>剧变反应</b>：<br>
		<span style="font-size:14px">不修改触发反应的事件的参数且不产生衍生物</span>
		<ul>
			<li><b class='gs_fire'>超</b><b class='gs_thunder'>载</b>：消耗所有火（燃）元素和雷元素，令承受者随机弃置一张牌。除非因此弃置红色牌，否则受到1点火焰伤害。</li>
			<li><b class='gs_water'>感</b><b class='gs_thunder'>电</b>：消耗所有水元素和雷元素，但少消耗1点元素量更高的元素（相同则随机减少），令承受者横置。若已横置，受到1点雷电伤害。</li>
			<li><b class='gs_thunder'>超</b><b class='gs_ice'>导</b>：消耗所有雷元素和冰（冻）元素，令承受者随机弃置场上一张牌。若未因此弃牌，受到1点寒冰伤害。</li>
			<li><b class='gs_fire'>烈</b><b class='gs_water_grass'>绽放</b>：消耗所有火（燃）元素和核元素，令与承受者距离1以内的所有角色，依次受到X点蔓草伤害并摸X张牌（X为消耗的核元素数且至多为2）。</li>
			<li><b class='gs_thunder'>超</b><b class='gs_water_grass'>绽放</b>：消耗所有雷元素和核元素，令承受者受到2X点蔓草伤害，然后摸2X张牌（X为消耗的核元素数且至多为2）。</li>
		</ul>
		
		<b>特殊反应</b>：<br>
		<span style="font-size:14px">能够生成元素或护盾</span>
		<ul>
			<li><b class='gs_wind'>扩散</b>：消耗所有火（燃）/水/雷/冰（冻）元素和风元素，令承受者距离1以内的其他角色附着一点火/水/雷/冰元素。</li>
			<li><b class='gs_fire'>燃</b><b class='gs_grass'>烧</b>：消耗所有火元素和草（激）元素，令承受者附着2点燃元素。</li>
			<li><b class='gs_rock'>结晶</b>：消耗所有火（燃）/水/雷/冰（冻）元素和岩元素，触发者（若无则改为承受者）抉择：令自身或承受者从牌堆顶获得两张“盾”。</li>
			<li><b class='gs_water'>原</b><b class='gs_grass'>绽放</b>：消耗所有水元素和草（激）元素，承受者附着1点核元素。</li>
			<li><b class='gs_water'>冻</b><b class='gs_ice'>结</b>：消耗所有水元素和冰元素，承受者附着1点冻元素。</li>
			<li><b class='gs_thunder'>原</b><b class='gs_grass'>激化</b>：消耗所有雷元素和草元素，承受者附着1点激元素。</li>
		</ul>`
	help['<span class="gs_water">元素共鸣</span>'] =
		`<li>一级元素被附着后，角色身上就会出现元素的图标，这个图标可以被称为<span style="color:rgb(127, 7, 240)">元素指示物</span>。</li>
		<li style="font-size:14px">护盾是<span class='gs_rock'>岩</span>元素的额外指示物，角色的技能可以自定义元素指示物。当至少有两名角色拥有相同元素的指示物时，会激活<span style="color: #07a6f0">元素共鸣</span>，<span class='gs_wind'>风</span>的元素共鸣需要角色没有元素附着且没有护盾。</li>
		<li>未尽事宜，详看<span style="color:rgb(255, 0, 0)">开发文档</span></li>
		<ul>
			<li><b class='gs_fire'>热诚之火</b>：出牌阶段空闲时间点使用伤害牌的次数上限+2。</li>
			<li><b class='gs_water'>疗愈之水</b>：结束阶段，亮出牌堆顶的两张牌。若其中有红色牌，抉择：回复 1 点体力，获得这些红色牌。</li>
			<li><b class='gs_wind'>迅捷之风</b>：横置或翻至背面时，取消之。</li>
			<li><b class='gs_thunder'>强能之雷</b>：摸牌阶段，额定摸牌数+1。</li>
			<li><b class='gs_grass'>蔓生之草</b>：准备阶段，观看牌堆顶的三张牌并以任意顺序置于牌堆顶或牌堆底。</li>
			<li><b class='gs_ice'>粉碎之冰</b>：使用伤害牌指定唯一目标后进行判定，若结果为：黑色，弃置目标一张牌；♠，此牌的伤害+1。</li>
			<li><b class='gs_rock'>坚定之岩</b>：每轮限一次，你可以使用或打出一张“盾”。</li>
		</ul>`
	return help;
})()
export { PRECONTENT, CONTENT, CONFIG, HELP };

