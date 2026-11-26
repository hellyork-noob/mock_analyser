import { PlusCircle } from 'lucide-react';
import type { Mock, CustomExamProfile } from '../../data/types';
import DetailedMetrics from './DetailedMetrics';

export default function AnalyticsPage({ mocks, exam, onAdd, profile }: {
  mocks: Mock[]; exam: string; onAdd: () => void; profile?: CustomExamProfile;
}) {
  return <div className="p3-analytics analytics-single-page">
    <div className="analyticsbar">
      <div><span className="eyebrow">{exam}</span><h2>Performance analytics</h2></div>
      <button type="button" className="primary" onClick={onAdd}><PlusCircle size={16}/> Add mock</button>
    </div>
    <DetailedMetrics key={exam} mocks={mocks.filter(mock => mock.exam === exam)} exam={exam} profile={profile} onAdd={onAdd}/>
  </div>;
}
