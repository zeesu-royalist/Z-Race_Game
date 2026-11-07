import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { X, Car, UploadCloud, Info, CheckCircle2 } from 'lucide-react';

export function CarCustomizerModal({ isOpen, onClose }) {
  const carModelPath = useGameStore((s) => s.carModelPath);
  const setCarModelPath = useGameStore((s) => s.setCarModelPath);

  const [inputPath, setInputPath] = useState(carModelPath || '/cars-models/');

  if (!isOpen) return null;

  const handleApplyCustomModel = (e) => {
    e.preventDefault();
    if (inputPath.trim()) {
      setCarModelPath(inputPath.trim());
    } else {
      setCarModelPath(null);
    }
  };

  const handleReset = () => {
    setCarModelPath(null);
    setInputPath('/cars-models/');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Car className="text-cyan" size={24} />
            <h2>3D CAR MODEL MANAGER</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* SECTION 1: CUSTOM 3D MODEL LOADER */}
          <div className="garage-section custom-model-box">
            <div className="section-title">
              <UploadCloud size={18} className="text-cyan" />
              <span>Custom 3D Car Model (.GLB)</span>
            </div>
            <p className="section-description">
              Aap apni 3D Car file ko <code>public/cars-models/</code> me daal kar uska naam yaha likhein aur <b>Apply</b> dabayein:
            </p>

            <form onSubmit={handleApplyCustomModel} className="custom-model-form">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/cars-models/car.glb"
                className="model-path-input"
              />
              <button type="submit" className="action-btn apply-btn">
                Apply Model
              </button>
            </form>

            <div className="model-status-row">
              <span className="status-label">Active Model:</span>
              <span className="status-val text-cyan">
                {carModelPath ? carModelPath : 'Awaiting Custom GLB Model (Minimalist Slot Active)'}
              </span>
              {carModelPath && (
                <button className="text-btn" onClick={handleReset}>
                  Remove
                </button>
              )}
            </div>

            <div className="info-tip">
              <Info size={16} />
              <span>
                <b>Ready for Next Prompt:</b> Jaise hi aap model denge, vo automatically yaha attach ho jayega aur uski physics, suspension, drifting, aur camera lighting auto-configure ho jayenge!
              </span>
            </div>
          </div>

          {/* SECTION 2: SPECIFICATIONS */}
          <div className="garage-section">
            <div className="section-title">Physics & Vehicle Tuning</div>
            <div className="specs-grid">
              <div className="spec-card">
                <span className="spec-label">SUSPENSION</span>
                <span className="spec-val">BVH Raycast 4-Point</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">TOP SPEED</span>
                <span className="spec-val">260 KM/H</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">TRANSMISSION</span>
                <span className="spec-val">6-Speed Auto + Rev</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">NITRO BOOST</span>
                <span className="spec-val">+65% Surge</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>
            RESUME SIMULATOR
          </button>
        </div>
      </div>
    </div>
  );
}
