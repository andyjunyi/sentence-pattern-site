/**
 * scripts/generate-batch.ts
 * Run: npx tsx scripts/generate-batch.ts
 *
 * Generates data/patterns/2-1.json … 2-20.json and 3-1.json … 3-20.json
 * using claude-haiku-4-5-20251001 via Anthropic API.
 */

import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// ── Load .env.local ────────────────────────────────────────────────
function loadEnv() {
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
}
loadEnv()

// ── Pattern list ───────────────────────────────────────────────────
const PATTERNS = [
  // ── Chapter 2 ──
  {
    code: '2-1', chapter: 2,
    title: 'S + 連綴動詞 + SC（主詞補語）',
    formula: 'S + linking V (be/become/seem/feel/look/taste...) + SC',
    description: '連綴動詞後接形容詞或名詞作主詞補語，描述主詞狀態或性質，不可用副詞替換補語',
  },
  {
    code: '2-2', chapter: 2,
    title: 'S + V + O + OC（受詞補語）',
    formula: 'S + make/find/keep/call/consider + O + OC (adj./N/p.p.)',
    description: '受詞補語句型，補語說明受詞的狀態，常見動詞有 make, find, keep, consider, call, name, elect',
  },
  {
    code: '2-3', chapter: 2,
    title: 'S + 授與動詞 + IO + DO（雙受詞）',
    formula: 'S + give/send/teach/show + IO + DO',
    description: '授與動詞後接間接受詞（人）和直接受詞（物），可改寫為 V + DO + to/for + IO，注意 to 和 for 的選用',
  },
  {
    code: '2-4', chapter: 2,
    title: '使役動詞 make/let/have + O + V',
    formula: 'make/let/have + O + 原形V',
    description: '使役動詞後接受詞加原形動詞，表讓/使某人做某事；make 被動時後接 to V；have 也可接 O + p.p.（被動意義）',
  },
  {
    code: '2-5', chapter: 2,
    title: '感官動詞 see/hear/feel + O + V / V-ing',
    formula: 'see/hear/watch/feel/notice + O + V / V-ing',
    description: '感官動詞後接受詞加原形動詞（目睹完整動作）或現在分詞（動作進行中），被動時原形動詞改為 to V',
  },
  {
    code: '2-6', chapter: 2,
    title: 'too + adj./adv. + to V',
    formula: 'too + adj./adv. + (for sb.) + to V',
    description: '表「太……以致無法……」，具否定意涵；可加 for + 受詞說明主體；可改寫為 so...that + S + can\'t',
  },
  {
    code: '2-7', chapter: 2,
    title: 'adj./adv. + enough + to V',
    formula: 'adj./adv. + enough + (for sb.) + to V',
    description: '表「足夠……可以……」，enough 放在形容詞／副詞之後；可改寫為 so...that + S + can；注意 enough 位置不可置於形容詞前',
  },
  {
    code: '2-8', chapter: 2,
    title: 'so + adj./adv. + that + 子句',
    formula: 'so + adj./adv. + that + S + V',
    description: '表「如此……以致於……」，so 後接形容詞或副詞，that 引導結果子句；注意 so 與 such 的區別：so 接形容詞，such 接名詞片語',
  },
  {
    code: '2-9', chapter: 2,
    title: 'such + (a/an +) adj. + N + that + 子句',
    formula: 'such + (a/an) + adj. + N + that + S + V',
    description: '表「如此……的……以致於……」，such 後接名詞片語；可數單數名詞前加 a/an，複數或不可數名詞直接接；與 so...that 可互換',
  },
  {
    code: '2-10', chapter: 2,
    title: 'not only...but (also)...（倒裝）',
    formula: 'Not only + 助動詞 + S + V..., but (also) + S + V...',
    description: 'not only 置句首時主句需倒裝（助動詞提前），but also 部分不倒裝；not only...but also 連接相同詞性，動詞與 but also 後的主詞一致',
  },
  {
    code: '2-11', chapter: 2,
    title: 'either...or... / neither...nor...',
    formula: 'either A or B / neither A nor B',
    description: 'either...or 表「不是A就是B」；neither...nor 表「A和B都不」；動詞依就近原則與最近的主詞一致（近似一致原則）',
  },
  {
    code: '2-12', chapter: 2,
    title: 'both...and... / not...but...',
    formula: 'both A and B / not A but B',
    description: 'both...and 表「A和B兩者都」，動詞用複數；not...but 表「不是A而是B」，動詞與 but 後的主詞一致',
  },
  {
    code: '2-13', chapter: 2,
    title: 'as + adj./adv. + as...（同等比較）',
    formula: 'as + adj./adv. + as + 比較對象',
    description: '表兩者程度相同；否定 not as/so...as 表「不如……」；可加倍數詞 twice/three times...as...as；注意比較對象需對等',
  },
  {
    code: '2-14', chapter: 2,
    title: '比較級 + than...（不等比較）',
    formula: 'adj./adv.-er / more + adj./adv. + than + 比較對象',
    description: '兩者比較，規則單音節加 -er，多音節用 more；注意不規則比較級（good→better, bad→worse）；比較對象須對等',
  },
  {
    code: '2-15', chapter: 2,
    title: 'would rather + V + than + V',
    formula: 'S + would rather + V... + than + V...',
    description: '表「寧願……也不願……」，兩個動詞均用原形；也可單獨用 would rather + V（寧願做某事）；後接 that 子句用假設語氣過去式',
  },
  {
    code: '2-16', chapter: 2,
    title: 'prefer + N/V-ing + to + N/V-ing',
    formula: 'prefer + N/V-ing + to + N/V-ing / prefer to V rather than V',
    description: '表「喜歡……勝過……」，to 是介系詞後接名詞或動名詞；也可 prefer to V rather than V；注意 prefer to 後接原形',
  },
  {
    code: '2-17', chapter: 2,
    title: 'as + adj./adv. + as possible',
    formula: 'as + adj./adv. + as possible / as + adj./adv. + as + S + can',
    description: '表「盡可能地……」，possible 可替換為 S + can/could；常見搭配：as soon as possible, as quickly as possible',
  },
  {
    code: '2-18', chapter: 2,
    title: 'S + find/think/consider + it + adj. + to V（虛受詞）',
    formula: 'S + find/think/consider + it + adj. + to V / that 子句',
    description: '虛受詞 it 代替後方真正的受詞（不定詞或 that 子句）；常見動詞：find, think, consider, make, feel；it 是形式受詞',
  },
  {
    code: '2-19', chapter: 2,
    title: 'have/get + O + p.p.（使役被動）',
    formula: 'have/get + O + p.p.',
    description: '表「請人完成某事」或「遭受某事」，受詞與過去分詞為被動關係；have + O + V-ing 表受詞主動進行；get 比 have 更口語',
  },
  {
    code: '2-20', chapter: 2,
    title: 'used to + V / be used to + V-ing',
    formula: 'used to + V / be/get used to + V-ing',
    description: 'used to + V 表過去習慣（現在已不如此）；be used to + V-ing 表習慣於（目前狀態）；get used to 表逐漸習慣；注意三者區別',
  },

  // ── Chapter 4 ──
  { code: '4-1', chapter: 4, title: 'S + V + N + who/that + V（限定關係子句）', formula: 'N + who/that + V...', description: '關係代名詞 who/that 引導限定用法，修飾人，限定先行詞的範圍，去掉子句意思改變' },
  { code: '4-2', chapter: 4, title: 'S + V + N + which/that + V（限定關係子句）', formula: 'N + which/that + V...', description: '關係代名詞 which/that 引導限定用法，修飾事物，限定先行詞範圍' },
  { code: '4-3', chapter: 4, title: 'S + V + N, who/which + V（非限定關係子句）', formula: 'N, who/which + V...', description: '關係代名詞引導非限定用法，逗號後補充說明先行詞，不可用 that，去掉不影響主句意義' },
  { code: '4-4', chapter: 4, title: 'S + V + N + whose + N + V', formula: 'N + whose + N + V...', description: '所有格關係代名詞 whose，表達「……的」，可修飾人或物，whose + N 在子句中作主詞或受詞' },
  { code: '4-5', chapter: 4, title: 'S + V + N + whom + S + V', formula: 'N + whom + S + V...', description: '受格關係代名詞 whom，作動詞或介系詞受詞，正式書面用語，口語中常以 who 或省略代替' },
  { code: '4-6', chapter: 4, title: 'S + V + N + which/that + S + V（受格省略）', formula: 'N + (which/that) + S + V...', description: '受格關係代名詞作受詞時可省略，省略後句子仍正確，作主詞時不可省略' },
  { code: '4-7', chapter: 4, title: 'the place/time/reason + where/when/why + S + V', formula: 'N(place/time/reason) + where/when/why + S + V', description: '關係副詞 where/when/why 引導形容詞子句，修飾地點、時間、原因名詞，可用介系詞 + which 改寫' },
  { code: '4-8', chapter: 4, title: 'what + S + V（名詞子句作主詞）', formula: 'What + S + V + is/seems... (= The thing that + S + V)', description: 'what 引導名詞子句作主詞，等於 the thing that，what 在子句中扮演主詞或受詞角色' },
  { code: '4-9', chapter: 4, title: 'that + S + V（名詞子句作受詞）', formula: 'S + V + that + S + V', description: 'that 引導名詞子句作動詞受詞，作受詞時 that 常省略，常見動詞：know, think, believe, say, hope' },
  { code: '4-10', chapter: 4, title: 'whether/if + S + V（名詞子句）', formula: 'S + V + whether/if + S + V', description: 'whether/if 引導名詞子句表達「是否……」，whether 可作主詞或受詞，if 只作受詞；whether...or not 強調兩者皆可' },
  { code: '4-11', chapter: 4, title: '疑問詞 + S + V（間接問句）', formula: 'S + V + wh- + S + V（直述句語序）', description: 'wh- 疑問詞引導間接問句，語序改為直述句（主詞 + 動詞），不用倒裝；常見引導動詞：know, wonder, tell, ask' },
  { code: '4-12', chapter: 4, title: 'S + know/wonder/ask + wh- + to V', formula: 'S + V + wh- + to V', description: '疑問詞加不定詞作動詞受詞，等於疑問詞引導的名詞子句，what/how/where/when/which + to V' },
  { code: '4-13', chapter: 4, title: 'whoever/whatever/whichever + S + V', formula: 'whoever/whatever/whichever + S + V（含先行詞的關係子句）', description: '複合關係代名詞，含先行詞的關係子句，whoever = anyone who，whatever = anything that，可作主詞或受詞' },
  { code: '4-14', chapter: 4, title: 'wherever/whenever/however + S + V', formula: 'wherever/whenever/however + S + V', description: '複合關係副詞，表達「無論何地/何時/如何」，引導讓步副詞子句，等同 no matter where/when/how' },
  { code: '4-15', chapter: 4, title: 'the fact that + S + V（同位語子句）', formula: 'the fact/news/idea/belief + that + S + V', description: '同位語子句，that 子句說明前面名詞的具體內容，常見名詞：fact, news, idea, belief, hope, possibility' },
  { code: '4-16', chapter: 4, title: 'S + V + so + adj./adv. + that + S + V（結果子句）', formula: 'so + adj./adv. + that + S + V', description: '程度副詞子句，so 後接形容詞或副詞，that 引導結果子句；so many/much/few/little + N + that 表數量程度' },
  { code: '4-17', chapter: 4, title: 'S + V + such + N + that + S + V（結果子句）', formula: 'such + (a/an) + adj. + N + that + S + V', description: 'such 修飾名詞片語，that 引導結果子句；可數單數加 a/an，複數或不可數直接接；與 so...that 可互換改寫' },
  { code: '4-18', chapter: 4, title: 'S + V + as if/as though + S + V（過去式）', formula: 'S + V + as if/as though + S + V-ed/were（假設）', description: 'as if/as though 引導方式副詞子句，表達假設情境；與現在事實相反用過去式，與過去相反用過去完成式' },
  { code: '4-19', chapter: 4, title: 'no matter + wh- / wh-ever + S + V', formula: 'no matter what/who/how... / whatever/whoever... + S + V', description: '讓步副詞子句，表達「無論……」，no matter + 疑問詞等同 -ever 複合詞；強調任何條件下主句都成立' },
  { code: '4-20', chapter: 4, title: 'S + V + N + that + S + V（同位語子句）', formula: 'N + that + S + V（同位語）', description: 'that 引導同位語子句，解釋說明前面的抽象名詞；注意與限定關係子句的區別：同位語 that 不代替先行詞' },
  { code: '4-21', chapter: 4, title: 'It + V + that + S + V（虛主詞 + 名詞子句）', formula: 'It + is/seems/appears + that + S + V', description: 'it 作虛主詞，that 子句作真正主詞；常見結構：It is said/known/believed/reported that...，表被動加虛主詞' },
  { code: '4-22', chapter: 4, title: 'S + find/think/make + it + adj. + to V（虛受詞）', formula: 'S + V + it + adj./N + to V / that 子句', description: 'it 作虛受詞代替後方真正受詞（不定詞或 that 子句），常見動詞：find, think, consider, make, feel, believe' },
  { code: '4-23', chapter: 4, title: 'S + V + prep. + which/whom + S + V（介系詞 + 關係代名詞）', formula: 'N + prep. + which/whom + S + V', description: '介系詞置於關係代名詞前，正式書面用法；口語中介系詞置句尾；prep. + which 修飾物，prep. + whom 修飾人' },
  { code: '4-24', chapter: 4, title: 'which + S + V（指涉整個子句的關係代名詞）', formula: 'S + V..., which + V...（指涉前句內容）', description: 'which 引導非限定子句，可指涉前面整個句子的內容，相當於 and this/that，不可用 that 替換' },
  { code: '4-25', chapter: 4, title: 'S + V + N + as + S + V（as 引導關係子句）', formula: 'such/the same + N + as + S + V / as + S + V...', description: 'as 作關係代名詞，常用於 such...as / the same...as 結構；as 也可引導讓步子句（As + S + V...）' },

  // ── Chapter 5 ──
  { code: '5-1', chapter: 5, title: 'S + be + p.p. + (by + agent)（基本被動語態）', formula: 'S + am/is/are + p.p. + (by + agent)', description: '現在式被動語態，主詞為動作承受者；by 引導行為者，不必要時可省略；注意及物動詞才能用被動' },
  { code: '5-2', chapter: 5, title: 'S + was/were + p.p.（過去被動）', formula: 'S + was/were + p.p. + (by + agent)', description: '過去式被動語態，表示過去某時被執行的動作；主詞單數用 was，複數用 were' },
  { code: '5-3', chapter: 5, title: 'S + will be + p.p.（未來被動）', formula: 'S + will be + p.p. / S + is/are going to be + p.p.', description: '未來式被動語態，表示將被執行的動作；can/should/must + be + p.p. 為情態動詞被動' },
  { code: '5-4', chapter: 5, title: 'S + have/has been + p.p.（現在完成被動）', formula: 'S + have/has been + p.p.', description: '現在完成式被動語態，表示已被完成的動作或影響持續到現在；注意與現在完成主動式的改寫' },
  { code: '5-5', chapter: 5, title: 'S + be + being + p.p.（進行被動）', formula: 'S + is/are/was/were + being + p.p.', description: '進行式被動語態，表示正在被進行的動作；現在進行：is/are being + p.p.；過去進行：was/were being + p.p.' },
  { code: '5-6', chapter: 5, title: 'S + be + p.p. + to V（被動 + 不定詞）', formula: 'S + be + expected/required/allowed/asked + to V', description: '被動語態後接不定詞，常見動詞：expect, require, allow, ask, tell, force, encourage, permit' },
  { code: '5-7', chapter: 5, title: 'S + get + p.p.（get 被動）', formula: 'S + get + p.p.（口語被動，強調過程或偶發）', description: 'get 代替 be 的被動語態，口語常用，強調過程、偶發事件或自身過失；常見：get hurt, get lost, get fired' },
  { code: '5-8', chapter: 5, title: 'S + have + O + p.p.（使役被動）', formula: 'S + have/get + O + p.p.', description: 'have/get + 受詞 + 過去分詞，表示讓人做某事（主動請人）或遭受某事（被動遭遇）；受詞與 p.p. 為被動關係' },
  { code: '5-9', chapter: 5, title: 'S + make/let/have + O + V原形（使役動詞）', formula: 'make/let/have + O + 原形V', description: '使役動詞後接受詞加原形動詞；make 含強迫意味，let 表允許，have 表委託；make 被動時改為 to V' },
  { code: '5-10', chapter: 5, title: 'S + get/cause + O + to V（使役動詞）', formula: 'get/cause + O + to V', description: 'get 和 cause 使役接受詞 + 不定詞（to V）；get 較口語，cause 較正式；與 make/have 的區別在於接 to V' },
  { code: '5-11', chapter: 5, title: 'S + see/hear/watch + O + V-ing/V原形（感官動詞）', formula: 'see/hear/watch/feel/notice + O + V / V-ing', description: '感官動詞後接原形（目睹完整動作）或現在分詞（動作進行中）；被動時原形改為 to V；感官動詞不用進行式' },
  { code: '5-12', chapter: 5, title: 'S + help + O + (to) V（help 用法）', formula: 'S + help + O + (to) V / help + (to) V', description: 'help 後接受詞加不定詞，to 可省略；help + 原形 也正確；cannot help + V-ing 表「忍不住」（意思不同）' },
  { code: '5-13', chapter: 5, title: 'S + keep/leave + O + V-ing/adj.（保持狀態）', formula: 'keep/leave + O + V-ing / adj.', description: 'keep/leave 後接受詞加現在分詞或形容詞，表示讓某人或物保持某狀態；keep + V-ing 也表持續做某事' },
  { code: '5-14', chapter: 5, title: 'S + find/consider/think + O + adj./N（受詞補語）', formula: 'S + find/consider/think/believe + O + adj./N', description: '受詞補語句型，形容詞或名詞補充說明受詞狀態；也可接 to be + adj./N 或虛受詞 it + adj. + to V' },
  { code: '5-15', chapter: 5, title: 'S + name/call/elect + O + N（受詞補語命名）', formula: 'S + name/call/elect/appoint/choose + O + N', description: '命名、稱呼、選舉類動詞的受詞補語句型，受詞補語為名詞；被動：S + be + called/named/elected + N' },
  { code: '5-16', chapter: 5, title: 'S + used to + V（過去習慣）', formula: 'S + used to + V（現在不再如此）', description: 'used to 表達過去的習慣或狀態，現在已不如此；否定：didn\'t use to / used not to；疑問：Did S use to V?' },
  { code: '5-17', chapter: 5, title: 'S + be used to + V-ing（習慣於）', formula: 'S + be/get used to + V-ing（目前習慣）', description: 'be used to 表習慣於某事（目前狀態），to 為介系詞後接動名詞；get used to 表逐漸習慣；注意與 used to V 的區別' },
  { code: '5-18', chapter: 5, title: 'S + had better + V / S + ought to + V', formula: 'S + had better (not) + V / S + ought to + V', description: 'had better 表建議（帶有警告或後果意味），後接原形；ought to 表義務或應然，接原形；兩者皆無人稱變化' },
  { code: '5-19', chapter: 5, title: 'S + must/have to + V（義務必要）', formula: 'S + must / have to + V', description: 'must 表主觀強烈義務，have to 表客觀必要；否定意思不同：must not（禁止），don\'t have to（不必）' },
  { code: '5-20', chapter: 5, title: 'S + should have + p.p.（過去應該做而沒做）', formula: 'S + should/ought to + have + p.p.', description: '情態動詞 + 完成式，表達對過去行為的責備、遺憾或後悔；should have p.p. = 應該做但沒做' },
  { code: '5-21', chapter: 5, title: 'S + must have + p.p.（對過去的推測）', formula: 'S + must have + p.p.（強烈推測過去）', description: 'must + 完成式，表達對過去情況的強烈肯定推測；may/might have p.p. 表可能（較不確定）；can\'t have p.p. 表否定推測' },
  { code: '5-22', chapter: 5, title: 'S + cannot have + p.p.（對過去的否定推測）', formula: 'S + cannot/could not + have + p.p.', description: 'cannot + 完成式，表達對過去情況的強烈否定推測，「不可能已經……」；與 must have p.p. 互為對立' },
  { code: '5-23', chapter: 5, title: 'S + need not / don\'t need to + V', formula: 'S + need not + V / S + don\'t need to + V', description: 'need 表「不必」；情態動詞 need not 直接接原形（無人稱變化）；一般動詞 don\'t need to 有人稱和時態變化' },
  { code: '5-24', chapter: 5, title: 'S + dare (not) + V（dare 的用法）', formula: 'S + dare (not) + V / S + dare to V / S + doesn\'t dare to V', description: 'dare 作情態動詞（dare not + 原形）或一般動詞（dare to V）；表達「敢/不敢」，情態動詞用法多用於疑問和否定' },
  { code: '5-25', chapter: 5, title: 'S + be supposed to + V', formula: 'S + be supposed to + V', description: 'be supposed to 表達「應該、理應」，常含有預期或規定的意味，暗示可能未達到；過去式 was/were supposed to 表「本應……但沒做」' },

  // ── Chapter 6 ──
  { code: '6-1', chapter: 6, title: 'S + V + to V（不定詞作受詞）', formula: 'S + want/hope/plan/decide/expect + to V', description: '動詞後接不定詞作受詞，常見動詞：want, hope, plan, decide, expect, wish, refuse, agree, promise, offer' },
  { code: '6-2', chapter: 6, title: 'S + V + V-ing（動名詞作受詞）', formula: 'S + enjoy/finish/avoid/mind/consider + V-ing', description: '動詞後接動名詞作受詞，常見動詞：enjoy, finish, avoid, mind, consider, suggest, keep, practice, quit, deny' },
  { code: '6-3', chapter: 6, title: 'S + V + to V 或 V-ing（兩者皆可）', formula: 'S + like/start/begin/continue/try/remember/stop + to V / V-ing', description: '可接不定詞或動名詞的動詞；部分意思相同（like, start）；部分意思不同（remember, forget, stop, try）' },
  { code: '6-4', chapter: 6, title: 'to V 作主詞／動名詞作主詞', formula: 'To V + is... / V-ing + is... / It is + adj. + to V', description: '不定詞或動名詞作主詞，語法功能相同；不定詞作主詞時常用虛主詞 it 取代；動名詞作主詞較口語自然' },
  { code: '6-5', chapter: 6, title: 'S + V + O + to V（不定詞作受詞補語）', formula: 'S + ask/tell/want/allow/expect/force + O + to V', description: '受詞後接不定詞作受詞補語，常見動詞：ask, tell, want, allow, expect, force, encourage, persuade, remind' },
  { code: '6-6', chapter: 6, title: 'too + adj. + to V / adj. + enough + to V', formula: 'too + adj./adv. + to V / adj./adv. + enough + to V', description: '不定詞表結果：too...to（太…以致不能），enough...to（足夠…可以）；兩者皆可加 for + 受詞說明主體' },
  { code: '6-7', chapter: 6, title: 'S + V + in order to / so as to + V', formula: 'S + V + in order to / so as to + V（目的不定詞）', description: '不定詞表目的，in order to / so as to 較正式，可置句首；否定：in order not to / so as not to；口語直接用 to' },
  { code: '6-8', chapter: 6, title: 'S + V, V-ing...（分詞構句，主動）', formula: 'V-ing + ..., S + V... / S + V..., V-ing + ...', description: '現在分詞構句代替副詞子句，表同時動作、連續動作或原因；邏輯主詞必須與主句主詞一致' },
  { code: '6-9', chapter: 6, title: 'P.P. + ..., S + V...（分詞構句，被動）', formula: 'p.p. + ..., S + V...（= Because/When + S + was p.p.）', description: '過去分詞構句代替被動副詞子句，省略 Being 或 Having been；表示主詞被執行某動作後的狀態或原因' },
  { code: '6-10', chapter: 6, title: 'Having + p.p., S + V（完成分詞構句）', formula: 'Having + p.p. + ..., S + V...（先完成的動作）', description: '完成分詞構句，表示分詞的動作在主句動作之前已完成；被動：Having been + p.p.；強調先後順序' },
  { code: '6-11', chapter: 6, title: 'with + O + V-ing/p.p. + 主句', formula: 'with + O + V-ing（主動）/ p.p.（被動）', description: 'with 獨立分詞構句，表伴隨狀態或方式；O 主動執行動作用 V-ing，O 被執行動作用 p.p.；常作副詞修飾主句' },
  { code: '6-12', chapter: 6, title: 'S + spend + 時間/金錢 + V-ing', formula: 'S + spend + 時間/金錢 + V-ing / on + N', description: 'spend 主詞為人，後接時間/金錢再接動名詞或 on + 名詞；注意與 it takes 的區別：it takes 用虛主詞' },
  { code: '6-13', chapter: 6, title: 'S + be worth + V-ing', formula: 'S + be worth + V-ing（值得……）', description: 'be worth 後接動名詞，表「值得……」；動名詞的邏輯受詞是主句主詞；也可 be worth + N；It is worthwhile to V 類似' },
  { code: '6-14', chapter: 6, title: 'S + cannot help + V-ing', formula: 'S + cannot help + V-ing（忍不住……）', description: 'cannot help + 動名詞，表達「忍不住……」；也可說 cannot help but + 原形動詞（= cannot but + 原形）' },
  { code: '6-15', chapter: 6, title: 'S + look forward to + V-ing', formula: 'S + look forward to + V-ing（期待……）', description: 'look forward to 後接動名詞，to 為介系詞；類似結構：be committed/dedicated/opposed/used to + V-ing' },
  { code: '6-16', chapter: 6, title: 'S + be + adj. + enough + to V', formula: 'S + be + adj. + enough + to V', description: '形容詞 + enough 後接不定詞，表「足夠……可以……」；enough 置形容詞之後（不同於名詞前）；可加 for + 受詞' },
  { code: '6-17', chapter: 6, title: 'S + V + wh- + to V', formula: 'S + know/learn/decide/wonder + wh- + to V', description: '疑問詞加不定詞作受詞，表達「知道如何/何時/哪裡/哪個……」；等同於疑問詞引導的 should + V 名詞子句' },
  { code: '6-18', chapter: 6, title: 'S + stop/remember/forget + to V / V-ing（意思不同）', formula: 'stop/remember/forget/try/regret + to V（未來）/ V-ing（過去）', description: '接不定詞與動名詞意思不同：stop to V（停下來去做）vs stop V-ing（停止做）；remember/forget to V（記得/忘記去做）vs V-ing（記得/忘記做過）' },
  { code: '6-19', chapter: 6, title: 'V-ing / p.p. 作形容詞修飾名詞', formula: 'V-ing + N（主動/進行）/ p.p. + N（被動/完成）', description: '分詞作形容詞修飾名詞，V-ing 表主動或進行中，p.p. 表被動或完成；單個分詞前置，分詞片語後置修飾' },
  { code: '6-20', chapter: 6, title: 'S + be + V-ing（現在進行式）表未來計畫', formula: 'S + am/is/are + V-ing（表確定的未來安排）', description: '現在進行式表達確定的未來計畫或安排，通常需有時間副詞；常用動詞：go, come, leave, arrive, meet, start' },
  { code: '6-21', chapter: 6, title: 'It + be + no use/good + V-ing', formula: 'It is no use/good + V-ing（……是沒用的）', description: 'It is no use + 動名詞，表達「……是沒有用的」；類似：It is useless to V；There is no use in V-ing' },
  { code: '6-22', chapter: 6, title: 'S + be + accustomed/committed/dedicated + to + V-ing', formula: 'S + be + adj. + to + V-ing（to 為介系詞）', description: '形容詞 + to + 動名詞，to 為介系詞；常見：be accustomed/used to, be committed/dedicated/devoted to, be opposed to' },
  { code: '6-23', chapter: 6, title: 'S + object to / be opposed to + V-ing', formula: 'S + object to / be opposed to + V-ing', description: 'object to（反對）和 be opposed to（反對）後接動名詞，to 為介系詞；類似：be against + V-ing/N' },
  { code: '6-24', chapter: 6, title: 'There + be + N + V-ing/p.p.（存在句 + 分詞）', formula: 'There + be + N + V-ing（主動）/ p.p.（被動）', description: '存在句中名詞後接分詞作後位修飾或補語；V-ing 表名詞主動執行，p.p. 表名詞被執行；注意分詞與名詞的主被動關係' },
  { code: '6-25', chapter: 6, title: 'S + V + N + p.p.（受詞 + 過去分詞作受詞補語）', formula: 'S + have/get/want/find + O + p.p.', description: '過去分詞作受詞補語，受詞與 p.p. 為被動關係，「讓……被……」；常見動詞：have, get, want, find, need, keep' },

  // ── Chapter 7 ──
  { code: '7-1', chapter: 7, title: 'because / since / as + S + V（原因副詞子句）', formula: 'because/since/as + S + V, S + V', description: '表達原因：because 語氣最強（直接原因，常用於答 Why），since 表已知原因，as 表附帶理由；不可與 so 同用' },
  { code: '7-2', chapter: 7, title: 'although / though / even though + S + V（讓步子句）', formula: 'although/though/even though + S + V, S + V', description: '讓步副詞子句，表達「雖然……但是……」；even though 語氣更強（含事實）；不可與 but 同用；though 可置句尾' },
  { code: '7-3', chapter: 7, title: 'while / whereas + S + V（對比子句）', formula: 'While/Whereas + S + V, S + V（對比）', description: 'while/whereas 表達對比或對照關係，強調兩件事的差異；while 也可表時間同時進行，需依上下文判斷' },
  { code: '7-4', chapter: 7, title: 'when / while / as + S + V（時間子句）', formula: 'when/while/as + S + V, S + V', description: '時間副詞子句：when 表某時間點，while 強調兩動作同時進行（常接進行式），as 表動作同步或漸進變化' },
  { code: '7-5', chapter: 7, title: 'before / after / until / since + S + V', formula: 'before/after/until/since + S + V, S + V', description: '時間連接詞：before（之前）after（之後）until（直到）since（自從）；注意時態：since 接過去式，主句接完成式' },
  { code: '7-6', chapter: 7, title: 'as soon as / the moment / once + S + V', formula: 'as soon as / the moment / once + S + V, S + V', description: '表達「一……就……」，強調兩動作緊接；as soon as 最常用；once 強調第一次發生；子句用現在式代未來' },
  { code: '7-7', chapter: 7, title: 'so that / in order that + S + can/will + V（目的子句）', formula: 'S + V + so that/in order that + S + can/will/may + V', description: '目的副詞子句，表達「為了讓……」；so that 後需接助動詞；可改為不定詞 in order to V / so as to V' },
  { code: '7-8', chapter: 7, title: 'so + adj./adv. + that / such + N + that（結果子句）', formula: 'so + adj./adv. + that... / such + (a/an) + adj. + N + that...', description: '結果副詞子句：so 後接形容詞或副詞，such 後接名詞片語；兩者均接 that 引導結果子句，可互換改寫' },
  { code: '7-9', chapter: 7, title: 'if / unless / as long as（條件子句）', formula: 'if/unless/as long as/provided that + S + V, S + will + V', description: '條件副詞子句：if（如果）unless（除非 = if...not）as long as/provided that（只要）；子句用現在式代未來' },
  { code: '7-10', chapter: 7, title: 'not only... but (also)...（連接詞組）', formula: 'not only A but (also) B / Not only + 助動詞 + S + V...', description: 'not only...but also 連接相同詞性的成分；置句首時主句倒裝；強調 B 比 A 更重要；動詞與 but also 後主詞一致' },
  { code: '7-11', chapter: 7, title: 'both... and... / either... or... / neither... nor...', formula: 'both A and B / either A or B / neither A nor B', description: '對等連接詞組：both...and 動詞用複數；either...or 和 neither...nor 動詞依近似一致原則（就近）' },
  { code: '7-12', chapter: 7, title: 'however / therefore / moreover / furthermore（連接副詞）', formula: 'S + V; however/therefore/moreover, S + V', description: '連接副詞（副詞連接詞）用法：需加分號或句號分隔兩句，不可單獨連接兩句（否則為逗號接合錯誤）' },
  { code: '7-13', chapter: 7, title: 'S + V + as + S + V（方式子句）', formula: 'S + V + as + S + V（如同……一樣）', description: 'as 引導方式副詞子句，表達「如同……一樣」；常見：as + S + V（如同），as always（一如往常），just as（正如）' },
  { code: '7-14', chapter: 7, title: 'the + 比較級..., the + 比較級...', formula: 'The + 比較級 + S + V, the + 比較級 + S + V', description: '平行比較連接，表達「越……就越……」；兩個子句均以 the + 比較級開頭；注意動詞省略的情況' },
  { code: '7-15', chapter: 7, title: 'S + V + whether... or not', formula: 'S + V + whether... or not / whether or not + S + V', description: 'whether...or not 表達「無論是否……」；whether 引導名詞子句（是否）或讓步副詞子句（無論是否）' },
  { code: '7-16', chapter: 7, title: 'S + V + now that + S + V', formula: 'Now that + S + V, S + V', description: 'now that 表達「既然……（現在情況已成立）」，強調現在已成立的原因；語氣較 since 更強調當前情況' },
  { code: '7-17', chapter: 7, title: 'S + V + in that + S + V', formula: 'S + V + in that + S + V（在於……方面）', description: 'in that 表達「在於……」，說明前句的理由、方面或具體內容；較正式，常用於書面；類似 because 但更精確' },
  { code: '7-18', chapter: 7, title: 'S + V + except that / except for + N', formula: 'S + V + except that + S + V / except for + N', description: 'except that 後接子句，except for 後接名詞，表達「除了……之外」的例外情況；注意與 besides 的區別（besides 表另加）' },
  { code: '7-19', chapter: 7, title: 'No sooner + had + S + p.p. + than + S + V', formula: 'No sooner + had + S + p.p. + than + S + V（過去式）', description: '倒裝句型，表達「一……就……」；No sooner 置句首引發倒裝（助動詞 had 提前）；than 後不倒裝；等同 as soon as' },
  { code: '7-20', chapter: 7, title: 'Hardly/Scarcely + had + S + p.p. + when + S + V', formula: 'Hardly/Scarcely + had + S + p.p. + when/before + S + V', description: '倒裝句型，表達「幾乎還沒……就……」；Hardly/Scarcely 置句首引發倒裝；when/before 後不倒裝；強調動作幾乎同時' },
  { code: '7-21', chapter: 7, title: 'Not until + 時間/子句 + did + S + V（倒裝）', formula: 'Not until + 時間/子句 + did + S + V', description: 'not until 倒裝強調句，強調「直到……才……」；Not until 置句首，主句助動詞 did 提前倒裝；until 子句不倒裝' },
  { code: '7-22', chapter: 7, title: 'Only + 副詞/子句 + 助動詞 + S + V（only 倒裝）', formula: 'Only + 副詞/副詞片語/子句 + 助動詞 + S + V', description: 'only 修飾副詞或子句置句首時引發主句倒裝；only then, only when, only after, only by + N 等均可引發倒裝' },
  { code: '7-23', chapter: 7, title: 'Seldom/Rarely/Never + 助動詞 + S + V（否定副詞倒裝）', formula: 'Seldom/Rarely/Never/Hardly + 助動詞 + S + V', description: '否定副詞置句首引發倒裝（助動詞提前），強調否定意義；常見：seldom, rarely, never, hardly, scarcely, little, no sooner' },
  { code: '7-24', chapter: 7, title: 'S + V + as well as / in addition to + N/V-ing', formula: 'S + V + as well as / in addition to + N/V-ing', description: 'as well as 和 in addition to 表達「除……之外還……」；動詞以前者（主要主詞）為準，不受後者影響；in addition to 後接名詞或動名詞' },
  { code: '7-25', chapter: 7, title: 'S + V + rather than + V / N', formula: 'S + V + rather than + V（原形）/ N', description: 'rather than 表達「而不是……」，強調選擇；連接相同詞性；置句首時：Rather than V-ing, S + V；注意後接原形動詞' },

  // ── Chapter 3 ──
  {
    code: '3-1', chapter: 3,
    title: 'that 名詞子句（主詞 / 受詞）',
    formula: 'It is + adj./p.p. + that + S + V / S + V + that + S + V',
    description: 'that 引導名詞子句作主詞（常用虛主詞 It 開頭）或受詞（直接接在動詞後）；作主詞時 that 不可省，作受詞時可省略',
  },
  {
    code: '3-2', chapter: 3,
    title: '疑問詞 + to V（不定詞名詞片語）',
    formula: 'what/how/where/when/which/whether + to V',
    description: '疑問詞加不定詞，整體視為名詞片語，可作受詞或主詞；等同於 what/how... + S + should + V 的名詞子句；whether to V 表「是否要……」',
  },
  {
    code: '3-3', chapter: 3,
    title: '關係代名詞 who / which / that（限定子句）',
    formula: 'N + who/which/that + V...（修飾先行詞）',
    description: '關係代名詞引導形容詞子句限定先行詞，who/that 修飾人，which/that 修飾物；作受詞時可省略；先行詞為 all/the only/最高級後多用 that',
  },
  {
    code: '3-4', chapter: 3,
    title: '關係代名詞 whose（所有格關係子句）',
    formula: 'N + whose + N + V...（表所有關係）',
    description: '關係代名詞 whose 表所有格，可修飾人或物，等同 his/her/its/their 的角色；whose + N 在子句中作主詞或受詞',
  },
  {
    code: '3-5', chapter: 3,
    title: '關係副詞 where / when / why（形容詞子句）',
    formula: 'N + where/when/why + S + V...',
    description: 'where 修飾地點名詞（= in/at which），when 修飾時間名詞（= in/on/at which），why 修飾 reason（= for which）；可用介系詞 + which 改寫',
  },
  {
    code: '3-6', chapter: 3,
    title: '非限定關係子句 , who / which...（補充說明）',
    formula: ', who/which + V...（逗號引導，補充資訊）',
    description: '非限定子句前後有逗號，提供補充說明，去掉不影響主句意義；不可用 that；which 可代替整個前句（繼續關係代名詞用法）',
  },
  {
    code: '3-7', chapter: 3,
    title: '原因副詞子句 because / since / as',
    formula: 'because/since/as + S + V, S + V（或主句在前）',
    description: 'because 語氣最強（提供直接原因），since/as 語氣較弱（提供已知或附帶原因）；because 子句作答 Why 問句；注意避免 because...so... 的錯誤雙連接詞',
  },
  {
    code: '3-8', chapter: 3,
    title: '讓步副詞子句 although / even though / even if',
    formula: 'although/even though/even if + S + V, S + V',
    description: '表「雖然……但是……」；although/even though 陳述事實，even if 表假設；不可與 but 同用；though 較口語，可置句尾',
  },
  {
    code: '3-9', chapter: 3,
    title: '真實條件句 if / unless（第一條件句）',
    formula: 'If + S + V（現在式）, S + will/can/may + V',
    description: '表達可能發生的條件與結果，if 子句用現在式代替未來式；unless = if...not，表「除非」；主句與子句可互換順序',
  },
  {
    code: '3-10', chapter: 3,
    title: '假設語氣（與現在相反）If + S + V-ed...',
    formula: 'If + S + V-ed/were, S + would/could/might + V',
    description: '與現在或未來事實相反的假設，if 子句用過去式（be 動詞一律用 were），主句用 would/could/might + 原形動詞；if 省略時需倒裝（Were I...）',
  },
  {
    code: '3-11', chapter: 3,
    title: '假設語氣（與過去相反）If + S + had p.p....',
    formula: 'If + S + had p.p., S + would/could + have p.p.',
    description: '與過去事實相反，if 子句用過去完成式，主句用 would/could/might + have + p.p.；if 省略時倒裝為 Had S + p.p...；可與第二條件句混合使用',
  },
  {
    code: '3-12', chapter: 3,
    title: '分詞構句（主動）V-ing...（代替副詞子句）',
    formula: 'V-ing + ..., S + V...（= When/Because/After + S + V...）',
    description: '現在分詞開頭的分詞構句代替副詞子句，表時間、原因、條件等；分詞的邏輯主詞必須與主句主詞相同，否則需保留主詞（獨立分詞構句）',
  },
  {
    code: '3-13', chapter: 3,
    title: '分詞構句（被動）p.p. / Having been p.p....',
    formula: 'p.p. + ..., S + V...（= Because/When + S + was/were + p.p.）',
    description: '被動分詞構句以過去分詞（省略 Being/Having been）或 Having been + p.p. 開頭，代替被動副詞子句；Having been 強調先完成的動作',
  },
  {
    code: '3-14', chapter: 3,
    title: 'with + O + V-ing / p.p.（with 獨立分詞構句）',
    formula: 'with + O + V-ing（主動）/ p.p.（被動）+ 主句',
    description: '介系詞 with 引導獨立分詞構句，表伴隨狀態或方式；O 與 V-ing 為主動關係（O 正在執行動作），O 與 p.p. 為被動關係（O 被執行）',
  },
  {
    code: '3-15', chapter: 3,
    title: '目的副詞子句 so that / in order that',
    formula: 'S + V + so that/in order that + S + can/will/may + V',
    description: '表「為了讓……」的目的，so that 後接助動詞（can, will, may）；也可用不定詞改寫：in order to V / so as to V；注意不可說 so that to V',
  },
  {
    code: '3-16', chapter: 3,
    title: '時間副詞子句 when / while / as',
    formula: 'when/while/as + S + V, S + V',
    description: 'when 表「當……時（某一時刻）」，while 強調兩動作同時持續進行（常接進行式），as 表「隨著/正當……時」；while 子句可省略主詞 + be 動詞形成分詞構句',
  },
  {
    code: '3-17', chapter: 3,
    title: '時間副詞子句 before / after / until',
    formula: 'before/after/until + S + V, S + V（或主句在前）',
    description: 'before 表「在……之前」，after 表「在……之後」，until 表「直到……為止」（動作持續到某點）；not...until 表「直到……才……」',
  },
  {
    code: '3-18', chapter: 3,
    title: 'as soon as / the moment + S + V（一……就……）',
    formula: 'as soon as / the moment / once + S + V, S + V',
    description: '表「一……就……」，強調兩動作緊接發生；類似表達：no sooner...than（倒裝）、hardly/scarcely...when（倒裝）；子句用現在式代未來',
  },
  {
    code: '3-19', chapter: 3,
    title: 'no matter + 疑問詞 / -ever 複合詞',
    formula: 'no matter what/who/how/where + S + V, S + V / whatever/whoever/however...',
    description: '讓步副詞子句，表「無論……」；no matter + 疑問詞等同於 -ever 複合關係詞（whatever, whoever, however, wherever, whenever）；主句可在前或在後',
  },
  {
    code: '3-20', chapter: 3,
    title: 'It is time (that) + S + V-ed / It is time to V',
    formula: 'It is (high/about) time + S + V-ed / It is time + to V',
    description: '表「是……的時候了」；that 子句用假設語氣過去式（V-ed），表應當做但尚未做；用 high/about 加強語氣；也可接不定詞 It is time to V',
  },
] as const

// ── System prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `你是台灣高中英文教材編輯，專門為學測準備句型學習資料。
請嚴格按照指定 JSON 格式回應，不要有任何多餘文字。
所有中文使用繁體中文。
例句程度符合台灣高中學測英文程度。`

// ── User prompt builder ────────────────────────────────────────────
function buildPrompt(code: string, formula: string, description: string): string {
  return `請為以下句型生成完整的學習資料。

句型代碼：${code}
句型公式：${formula}
說明：${description}

請嚴格按照以下 JSON 結構回應，只回傳純 JSON，不要 markdown 包裹，不要任何說明文字：

{
  "formulas": [
    { "formula": "完整句型公式", "zh": "中文意思說明" }
  ],
  "explanation": "繁體中文用法說明（100-150字，含結構說明、使用時機、易混淆點、注意事項）",
  "examples": [
    {
      "id": 1,
      "eng": "英文例句（符合學測程度，15-25字）",
      "chi": "繁體中文翻譯",
      "keywords": ["句型核心關鍵字1", "關鍵字2"]
    }
  ],
  "adj_table_for": [
    { "adj": "詞彙或片語", "zh": "中文意思" }
  ],
  "adj_table_of": [],
  "extension": {
    "tip": "使用判斷技巧或常見錯誤說明（繁體中文，50-80字）",
    "examples": [
      { "test": "判斷範例或對照句", "result": "→ 結論與正確用法" }
    ],
    "note": "口訣或記憶技巧（繁體中文，一句話）"
  },
  "exercises": [
    {
      "id": 1,
      "parts": ["句子前段 ", null, " 句子後段"],
      "blanks": ["正確填空答案"],
      "sentence": "完整英文例句",
      "translation": "繁體中文翻譯",
      "keywords": ["關鍵字1", "關鍵字2"]
    }
  ]
}

生成要求：
1. formulas：列出此句型的核心公式（1-2個變體）
2. explanation：100-150字，說明結構、使用時機、易混淆點
3. examples：恰好 4 句，符合學測程度，實用且多樣
4. adj_table_for：列出與此句型相關的核心詞彙 12 個（依句型性質選擇形容詞、動詞、時間詞等）
5. adj_table_of：若句型涉及對比用法（如 for/of）列出 12 個；否則回傳空陣列 []
6. extension.examples：2-3個對照範例，說明正確 vs 錯誤或不同情境
7. exercises：恰好 4 題填空，parts 中 null 對應 blanks 中的答案，每題至少一個填空，答案為句型關鍵結構`
}

// ── Extract JSON from response ─────────────────────────────────────
function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

// ── Generate one pattern (with one retry) ──────────────────────────
async function generate(
  client: Anthropic,
  pattern: typeof PATTERNS[number],
): Promise<Record<string, unknown>> {
  const requestPayload = {
    model: 'claude-haiku-4-5-20251001' as const,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user' as const,
      content: buildPrompt(pattern.code, pattern.formula, pattern.description),
    }],
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const msg = await client.messages.create(requestPayload)
      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const data = extractJson(raw)
      return {
        code: pattern.code,
        chapter: pattern.chapter,
        title: pattern.title,
        ...data,
      }
    } catch (err) {
      lastError = err
      if (attempt === 1) {
        process.stdout.write(' [retry]')
        await new Promise(r => setTimeout(r, 1500))
      }
    }
  }
  throw lastError
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in .env.local')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey })
  const outDir = join(process.cwd(), 'data', 'patterns')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  let succeeded = 0
  let skipped = 0
  let failed = 0
  const failedCodes: string[] = []

  console.log(`\n🚀 Generating ${PATTERNS.length} patterns (chapters 2–3)\n`)

  for (const pattern of PATTERNS) {
    const outPath = join(outDir, `${pattern.code}.json`)

    if (existsSync(outPath)) {
      console.log(`⏭  ${pattern.code} — already exists, skipping`)
      skipped++
      continue
    }

    process.stdout.write(`🔄 ${pattern.code}  ${pattern.title} … `)

    try {
      const data = await generate(client, pattern)
      writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log('✅')
      succeeded++
    } catch (err) {
      console.log('❌')
      console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`)
      failed++
      failedCodes.push(pattern.code)
    }

    // Brief pause between requests (rate limiting)
    await new Promise(r => setTimeout(r, 800))
  }

  console.log('\n─────────────────────────────────')
  console.log(`✅ 成功：${succeeded}　⏭ 跳過：${skipped}　❌ 失敗：${failed}`)
  if (failedCodes.length > 0) {
    console.log(`   失敗句型：${failedCodes.join(', ')}`)
    console.log('   重新執行腳本可自動重試失敗項目。')
  }
  console.log('✨ Done\n')
}

main().catch(err => { console.error(err); process.exit(1) })
