// 简洁版挂机逻辑：资源、每秒产出、升级、转生与存档导出/导入
(function(){
  const el = id => document.getElementById(id)

  const state = {
    qi: 0,
    clickPower: 1,
    prestigeSeeds: 0,
    rank: 0,
    upgrades: [
      { key:'stove', name:'炼气炉', cost:10, qty:0, type:'passive', value:1 },
      { key:'manual', name:'引气法诀', cost:25, qty:0, type:'click', value:1 },
      { key:'furnace', name:'丹炉', cost:200, qty:0, type:'passive', value:10 }
    ]
  }

  function calcPerSec(){
    return state.upgrades.reduce((s,u)=> u.type==='passive' ? s + u.value*u.qty : s, 0)
  }

  function calcClick(){
    return state.clickPower + state.upgrades.reduce((s,u)=> u.type==='click' ? s + u.value*u.qty : s, 0)
  }

  // DOM
  const qiEl = el('qi'), perEl = el('qiPerSec'), clickEl = el('clickPower'), upgList = el('upgradesList'), logEl = el('log'), rankEl = el('rank'), prestigeEl = el('prestigeSeeds')

  function renderUpgrades(){
    upgList.innerHTML = ''
    state.upgrades.forEach((u, idx)=>{
      const d = document.createElement('div'); d.className='upgrade'
      d.innerHTML = `<div><strong>${u.name}</strong></div><div>数量: ${u.qty}</div><div>效果: ${u.type==='passive'? '+'+u.value+'/s':'+'+u.value+' 点击'}</div><div>价格: ${Math.floor(u.cost)}</div>`
      const btn = document.createElement('button')
      btn.textContent = '购买'
      btn.onclick = ()=>{ buyUpgrade(idx) }
      d.appendChild(btn)
      upgList.appendChild(d)
    })
  }

  function render(){
    qiEl.textContent = Math.floor(state.qi)
    perEl.textContent = formatNum(calcPerSec())
    clickEl.textContent = formatNum(calcClick())
    prestigeEl.textContent = state.prestigeSeeds
    rankEl.textContent = rankName()
  }

  function formatNum(n){ return (Math.round(n*100)/100) }
  function rankName(){
    if(state.rank>=4) return '大乘'
    if(state.rank>=3) return '金丹'
    if(state.rank>=2) return '筑基'
    if(state.rank>=1) return '炼气'
    return '凡人'
  }

  // Actions
  el('cultivate').addEventListener('click', ()=>{ state.qi += calcClick(); log('手动修炼'); render() })

  function buyUpgrade(i){
    const u = state.upgrades[i]
    if(state.qi >= u.cost){
      state.qi -= u.cost
      u.qty += 1
      u.cost *= 1.15
      log(`购买 ${u.name}`)
      renderUpgrades(); render()
    } else {
      log('元气不足')
    }
  }

  function log(msg){ const t = new Date().toLocaleTimeString(); logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent }

  // 转生（重置并获得灵根）
  el('prestige').addEventListener('click', ()=>{
    const gained = Math.floor(Math.sqrt(state.qi/1000))
    if(gained<=0){ log('转生需要更多元气（至少 1000 起）'); return }
    state.prestigeSeeds += gained
    log(`转生获得 ${gained} 灵根`)
    // 重置资源与升级，但保留灵根
    state.qi = 0; state.clickPower = 1; state.rank = 0
    state.upgrades.forEach(u=>{ u.qty = 0; u.cost = baseCost(u.key) })
    renderUpgrades(); render();
  })

  function baseCost(key){
    if(key==='stove') return 10
    if(key==='manual') return 25
    if(key==='furnace') return 200
    return 10
  }

  // 存档导出/导入
  el('exportSave').addEventListener('click', ()=>{
    const data = JSON.stringify(state)
    const blob = new Blob([data], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'xian_save.json'; a.click(); URL.revokeObjectURL(url)
  })
  el('importSave').addEventListener('click', ()=>{
    const txt = el('importArea').value.trim()
    if(!txt){ log('请在输入框粘贴存档 JSON'); return }
    try{ const d = JSON.parse(txt); Object.assign(state, d); log('导入存档成功'); renderUpgrades(); render() }catch(e){ log('导入失败：非法 JSON') }
  })

  // 主循环（挂机收益）
  let last = Date.now()
  function tick(){
    const now = Date.now(); const dt = (now-last)/1000; last = now
    const gain = calcPerSec()*dt
    state.qi += gain
    // 自动提升境界基于阈值
    if(state.qi > 500 && state.rank < 1) state.rank = 1
    if(state.qi > 2000 && state.rank < 2) state.rank = 2
    if(state.qi > 20000 && state.rank < 3) state.rank = 3
    if(state.qi > 200000 && state.rank < 4) state.rank = 4
    render()
    requestAnimationFrame(tick)
  }

  // 自动保存（每 7 秒）
  function autoSave(){
    try{ localStorage.setItem('xian_save_v1', JSON.stringify(state)); log('已自动保存') }catch(e){ }
  }

  // 加载存档
  function load(){
    try{
      const s = localStorage.getItem('xian_save_v1')
      if(s){ Object.assign(state, JSON.parse(s)); }
    }catch(e){ }
  }

  // init
  load(); renderUpgrades(); render();
  setInterval(autoSave,7000)
  requestAnimationFrame(tick)

})();
