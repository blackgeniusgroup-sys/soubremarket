import React, { useState, useRef, useEffect } from 'react';

const RESPONSES = {
  bonjour:    "Bonjour ! Je suis **SoubreBot** 🤖\n\nJe peux vous aider à :\n• 🛍️ Trouver un produit\n• 📦 Suivre une commande\n• 💰 Connaître les tarifs\n• 🏪 Contacter un vendeur",
  livraison:  "Délais de livraison :\n• 🏙️ Centre-ville : 30–45 min\n• 🏘️ Quartiers proches : 1–2h\n• 🌿 Zone rurale : 2–4h",
  paiement:   "Modes acceptés :\n• 💵 Cash à la livraison\n• 📱 Wave\n• 📱 Orange Money\n\nAucun frais supplémentaire !",
  commande:   "Pour suivre votre commande :\n1. Allez dans l'onglet **Suivi**\n2. Sélectionnez votre commande\n3. Suivez votre livreur en temps réel sur la carte 🗺️",
  whatsapp:   "Contactez directement vos commerçants via WhatsApp Business depuis la fiche produit. Bouton vert **💬 WhatsApp** disponible.",
  merci:      "De rien ! 😊 N'hésitez pas si vous avez d'autres questions. Bonne commande sur SoubreMarket !",
  aide:       "Je peux vous renseigner sur :\n• 🛍️ Les produits disponibles\n• 💰 Les tarifs de livraison\n• 💳 Les modes de paiement\n• 📦 Le suivi de commande\n• 🏪 Les commerçants partenaires",
};

function getResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes('bonjour')||m.includes('salut')||m.includes('hello')) return RESPONSES.bonjour;
  if (m.includes('livraison')||m.includes('délai')||m.includes('livrer'))  return RESPONSES.livraison;
  if (m.includes('paiement')||m.includes('payer')||m.includes('wave'))     return RESPONSES.paiement;
  if (m.includes('commande')||m.includes('suivi')||m.includes('statut'))   return RESPONSES.commande;
  if (m.includes('whatsapp')||m.includes('contact')||m.includes('vendeur'))return RESPONSES.whatsapp;
  if (m.includes('merci')||m.includes('super'))  return RESPONSES.merci;
  if (m.includes('aide')||m.includes('help'))    return RESPONSES.aide;
  return "Je n'ai pas compris votre question 🤔\n\nEssayez par exemple :\n• *« Quels sont vos délais de livraison ? »*\n• *« Comment payer avec Wave ? »*\n• *« Comment suivre ma commande ? »*";
}

function BotMessage({ text }) {
  return (
    <div style={{ maxWidth:'85%', padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background:'#F1F5F4', color:'#0D1F1B', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>
      {text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
    </div>
  );
}

export default function ChatBot({ onClose }) {
  const [msgs, setMsgs]   = useState([{ role:'bot', text: RESPONSES.bonjour }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs(m => [...m, { role:'user', text:userMsg }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setMsgs(m => [...m, { role:'bot', text: getResponse(userMsg) }]);
    setLoading(false);
  };

  return (
    <div className="slide-up" style={{ position:'fixed', bottom:80, right:16, width:320, background:'#fff', borderRadius:20, boxShadow:'0 12px 40px rgba(0,0,0,0.18)', zIndex:500, display:'flex', flexDirection:'column', maxHeight:480, overflow:'hidden', border:'1px solid #E2EAE7' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F6E56,#1D9E75)', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>🤖 SoubreBot</div>
          <div style={{ fontSize:11, color:'#9FE1CB', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#9FE1CB', display:'inline-block' }} />
            En ligne
          </div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'user'
              ? <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:'14px 14px 4px 14px', background:'#0F6E56', color:'#fff', fontSize:13 }}>{m.text}</div>
              : <BotMessage text={m.text} />}
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:5, padding:'10px 14px', background:'#F1F5F4', borderRadius:'14px 14px 14px 4px', width:'fit-content' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#94A3A0', animation:`bounce 0.8s ${i*0.15}s infinite alternate` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>
      {/* Suggestions rapides */}
      <div style={{ padding:'8px 12px', display:'flex', gap:6, overflowX:'auto', borderTop:'1px solid #F1F5F4' }}>
        {['Délais livraison','Paiement Wave','Suivi commande'].map(s => (
          <button key={s} onClick={() => { setInput(s); }} style={{ flexShrink:0, padding:'4px 10px', borderRadius:999, border:'1px solid #E2EAE7', background:'#F8FAFB', fontSize:11, color:'#4B6B63', cursor:'pointer', whiteSpace:'nowrap' }}>{s}</button>
        ))}
      </div>
      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #F1F5F4', display:'flex', gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}
          placeholder="Posez votre question..." style={{ flex:1, border:'1.5px solid #E2EAE7', borderRadius:10, padding:'8px 12px', fontSize:13, fontFamily:'Inter,sans-serif', outline:'none' }}
          onFocus={e => e.target.style.borderColor='#1D9E75'} onBlur={e => e.target.style.borderColor='#E2EAE7'} />
        <button onClick={send} style={{ width:38, height:38, borderRadius:10, background:'#0F6E56', color:'#fff', border:'none', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>→</button>
      </div>
      <style>{`@keyframes bounce { from{transform:translateY(0)} to{transform:translateY(-5px)} }`}</style>
    </div>
  );
}