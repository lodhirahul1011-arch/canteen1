import { useEffect,useState } from 'react'; import api from '../services/api';
export default function Payments(){
 const [rows,setRows]=useState([]),[error,setError]=useState('');
 useEffect(()=>{api.get('/payments').then(r=>setRows(r.data.data.payments||[])).catch(e=>setError(e.response?.data?.message||'Unable to load payments'));},[]);
 return <><div className="page-heading"><div><p className="eyebrow">Finance</p><h1>Payments</h1><p className="muted">Payment records linked to orders.</p></div></div><div className="panel">{error&&<p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Payment</th><th>Order</th><th>Member</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{rows.map(p=><tr key={p._id}><td>{p.paymentNo}</td><td>{p.order?.orderNo||'—'}</td><td>{p.order?.member?.name||'—'}</td><td>₹{Number(p.amount).toFixed(2)}</td><td>{p.method}</td><td>{p.status}</td></tr>)}</tbody></table></div>{!rows.length&&<p className="muted">No payments found.</p>}</div></>;
}
