/* 本体「保険診療オービット」：厚生労働省・DX審査支払機構の公表データだけで構成（医薬品は別アプリ） */
"use strict";
const APP={id:"main",title:"保険診療オービット",sub:"INSURANCE MEDICAL ORBIT",
  mods:["kensa","dpc","byomei","ryuui","tekio","gigi","tekiyo"],start:"home",
  searchPh:"点数・術式・DPC・病名・ICD・留意事項・疑義解釈をまとめて検索",
  eyebrow:"Medical fee navigator",headline:"保険診療のすべてを、ひとつの軌道で。",
  lead:"診療行為の点数（医科）・DPC・傷病名（ICD-10）・算定上の留意事項・疑義解釈を横断して検索でき、検査や手術の適応病名も調べられます。",
  core:"保険診療",
  sources:"出典：厚生労働省「医科診療行為マスター」「診断群分類（DPC）電子点数表」「傷病名マスター」「診療報酬の算定方法の一部改正に伴う実施上の留意事項について」「疑義解釈資料」等の事務連絡、「診療報酬請求書等の記載要領」別表Ⅰ（摘要欄）、DX審査支払機構「コンピュータチェックに関する公開」（適応病名）をもとに作成。",
  notOfficial:"厚生労働省・DX審査支払機構"};
