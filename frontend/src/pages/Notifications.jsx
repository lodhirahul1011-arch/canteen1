import { useEffect,useState } from 'react'; import api from '../services/api';
export default function Notifications(){
 const [items,setItems]=useState([]),[error,setError]=useState('');
 const load=()=>api.get('/notifications').then(r=>setItems(r.data.data.notifications||[])).catch(e=>setError(e.response?.data?.message||'Unable to load notifications'));
 useEffect(()=>{load();},[]);
 const read=async id=>{try{await api.patch(`/notifications/${id}/read`);load();}catch(e){setError(e.response?.data?.message||'Unable to update notification');}};
 const all=async()=>{try{await api.patch('/notifications/read-all');load();}catch(e){setError(e.response?.data?.message||'Unable to update notifications');}};
 return <><div className="page-heading"><div><p className="eyebrow">System</p><h1>Notifications</h1><p className="muted">Order, payment and inventory alerts.</p></div><button className="button" onClick={all}>Mark all read</button></div><div className="panel">{error&&<p className="error">{error}</p>}{items.length?items.map(n=><article key={n._id} className="notification"><strong>{n.title}</strong><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small>{!n.readAt&&<button className="button secondary" onClick={()=>read(n._id)}>Mark read</button>}</article>):<p className="muted">No notifications.</p>}</div></>;
}
