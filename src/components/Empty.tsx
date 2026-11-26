export default function Empty({ text }: {
    text: string;
}) {
    return (<div className="empty">
      <div className="emptyicon">◈</div>
      {text}
    </div>);
}
