import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { socialLinks } from "../data/site";
import { sendContactMessage } from "../services/contact";

export default function Contact() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const configured = Boolean(import.meta.env.VITE_CONTACT_ENDPOINT);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = {
      name: String(data.get("name") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
    };
    if (Object.values(message).some((value) => !value)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      await sendContactMessage(message);
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="page-shell contact-page">
      <div className="contact-intro">
        <p className="eyebrow">MEIRO / ХОЛБОО БАРИХ</p>
        <h1>
          Яриа бүр
          <br />
          <em>шинэ эхлэл.</em>
        </h1>
        <p>
          Бүтээлийн тухай асуулт, хамтрах санал эсвэл
          <br />
          зүгээр л мэнд мэдэхийг хүсвэл бидэнд бичээрэй.
        </p>
        <div className="contact-socials">
          <p className="eyebrow">БИДНИЙ ӨДӨР ТУТМААС</p>
          <a href={socialLinks.instagram} target="_blank" rel="noreferrer">
            Инстаграм <span>@meiro628</span>
            <ArrowUpRight size={20} />
          </a>
          <a href={socialLinks.facebook} target="_blank" rel="noreferrer">
            Фэйсбүүк <span>Meiro</span>
            <ArrowUpRight size={20} />
          </a>
          <p>
            Шинэ бүтээлүүд болон урлах явцыг
            <br />
            манай сошиал хуудсуудаас үзээрэй.
          </p>
        </div>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <p className="eyebrow">БИДЭНД ЗУРВАС ҮЛДЭЭХ</p>
        <label htmlFor="name">
          Таны нэр <span>*</span>
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Нэрээ бичнэ үү"
          required
          maxLength={100}
        />
        <label htmlFor="contact">
          И-мэйл эсвэл утасны дугаар <span>*</span>
        </label>
        <input
          id="contact"
          name="contact"
          placeholder="Тантай эргээд холбогдох хаяг"
          required
          maxLength={150}
        />
        <label htmlFor="subject">
          Сэдэв <span>*</span>
        </label>
        <select
          id="subject"
          name="subject"
          defaultValue={params.get("subject") ? "Бүтээлийн тухай" : ""}
          required
        >
          <option value="" disabled>
            Сэдэв сонгох
          </option>
          <option>Бүтээлийн тухай</option>
          <option>Хамтран ажиллах</option>
          <option>Бусад</option>
        </select>
        <label htmlFor="message">
          Таны зурвас <span>*</span>
        </label>
        <textarea
          id="message"
          name="message"
          placeholder="Бид таныг сонсоход бэлэн…"
          defaultValue={
            params.get("subject")
              ? `${params.get("subject")}-ийн талаар мэдээлэл авмаар байна. `
              : ""
          }
          required
          minLength={10}
          maxLength={5000}
          rows={5}
        />
        {!configured && (
          <p className="form-notice">
            Зурвас илгээх үйлчилгээг бэлдэж байна. Одоогоор Инстаграм эсвэл
            Фэйсбүүкээр бидэнд бичээрэй.
          </p>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={!configured || status === "sending"}
        >
          {status === "sending" ? "Илгээж байна…" : "Зурвас илгээх"}
          <ArrowRight size={18} />
        </button>
        <div aria-live="polite">
          {status === "success" && (
            <p className="form-success">
              Зурвас илгээгдлээ. Бид удахгүй хариу бичнэ. Баярлалаа!
            </p>
          )}
          {status === "error" && (
            <p className="form-error">
              Зурвас илгээгдсэнгүй. Мэдээллээ шалгаад дахин оролдоно уу, эсвэл
              сошиал хуудсаар холбогдоорой.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
