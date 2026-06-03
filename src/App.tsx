import { useWorldEngine } from './hooks/useWorldEngine';
import { BloomCanvas } from './components/BloomCanvas';
import { WorldHUD } from './components/WorldHUD';
import './App.css';

export default function App() {
  useWorldEngine();

  return (
    <div className="bloom-app">
      <BloomCanvas />
      <WorldHUD />
    </div>
  );
}
