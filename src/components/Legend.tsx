'use client';

import { TIME_OFF_REASONS } from '@/lib/constants';

export default function Legend() {
    return (
        <div className="legend">
            {Object.entries(TIME_OFF_REASONS).map(([key, reason]) => (
                <div key={key} className="legend-item">
                    <div
                        className="legend-color"
                        style={{ backgroundColor: reason.color }}
                    />
                    {reason.label}
                </div>
            ))}
            <div className="legend-item">
                <div
                    className="legend-color"
                    style={{
                        backgroundColor: 'transparent',
                        border: '2px dashed var(--text-muted)',
                    }}
                />
                Pending
            </div>
        </div>
    );
}
