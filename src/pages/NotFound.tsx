import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="page-shell not-found">
      <p className="eyebrow">404 / ТӨӨРЧИХӨВ ҮҮ?</p>
      <h1>
        Шинэ зам
        <br />
        <em>эндээс эхэлнэ.</em>
      </h1>
      <p>Энэ хуудас олдсонгүй. Бүтээлүүдтэй маань танилцаарай.</p>
      <Link className="button button-primary" to="/catalogue">
        Бүтээлүүд рүү ↗
      </Link>
    </div>
  );
}
