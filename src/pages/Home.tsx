import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import ImagePlaceholder from "../components/ImagePlaceholder";
import Carousel from "../components/Carousel";

export default function Home() {
  return (
    <>
      <section className="hero page-shell">
        <div className="hero-copy">
          {/*<p className="eyebrow">
            <span className="small-line" /> МОНГОЛД УРЛАСАН АРЬСАН ЭДЛЭЛ
          </p>*/}
          <h1>
            Өөрийн
            <br />
            <em>замаар.</em>
          </h1>
          <p className="hero-description">
            МОНГОЛД УРЛАСАН АРЬСАН ЭДЛЭЛ
            {/*Гарт мэдрэгдэх чанар.
            <br />
            Өдөр бүр хамт байх өөрийн тань нэг хэсэг.*/}
          </p>
          <Link className="button button-primary" to="/catalogue">
            Бүтээлүүдтэй танилцах <ArrowUpRight size={19} />
          </Link>
          {/*}
          <a
            className="hero-scroll"
            href="#our-story"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("our-story")?.scrollIntoView();
            }}
          >
            <span className="circle-arrow">
              <ArrowDown size={17} />
            </span>{" "}
            Бидний түүхийг нээх
          </a>*/}
        </div>
        <div className="hero-visual">
          <div className="hero-image">
            <img
              src={`${import.meta.env.BASE_URL}image_hero.png`}
              alt="Meiro-гийн урлаач ажлын ширээн дээр арьсыг нямбай зүсэж буй нь."
              fetchPriority="high"
              decoding="async"
            />
          </div>
          {/*<div className="hero-image-caption">
            <span>ГАР УРЛАЛ · СЭТГЭЛ ШИНГЭСЭН</span>
            <span>УЛААНБААТАР, МОНГОЛ</span>
          </div>*/}
          {/*<div className="material-tag">
            <span>Итали арьс.</span>
            <em>Монгол ур.</em>
            <ArrowUpRight size={20} />
          </div>*/}
        </div>
      </section>
      {/*}
      <div className="values-strip">
        <span>Чанартай итали арьс</span>
        <span aria-hidden="true">✳</span>
        <span>Монголд гараар урлав</span>
        <span aria-hidden="true">✳</span>
        <span>Өдөр тутмын онцгой зүйлс</span>
        <span aria-hidden="true">✳</span>
        <span>Өөрийн гэсэн төрх</span>
      </div>
      */}
      <section className="story-section page-shell" id="our-story">
        <div className="section-side">
          <p className="eyebrow">01 / БИДНИЙ ТҮҮХ</p>
          <span className="story-symbol" aria-hidden="true">
            迷路
          </span>
          <span className="tiny-note">MEIRO — ТӨӨРДӨГ ЗАМ</span>
        </div>
        <div className="story-content">
          <h2>
            Заримдаа төөрөх нь
            <br />
            <em>өөрийгөө олох эхлэл.</em>
          </h2>
          <div className="story-columns">
            <p>
              Meiro гэдэг нь япон хэлний «迷路» буюу төөрдөг зам гэсэн үг. Бид
              хоёрын нэр, хамтдаа эхлүүлсэн аялал энэ нэрэнд шингэсэн.
            </p>
            <p>
              Бүтээл бүр бидний замын нэг хэсэг. Яарах хэрэггүй. Ажиглаарай,
              хүрч мэдрээрэй. Манай жижигхэн ертөнцөөр аялж, өөрт ойр нэгнийг
              олоорой.
            </p>
          </div>
          <Link className="text-link" to="/contact">
            Бидэнтэй танилцах <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="craft-section">
        <div className="craft-visual">
          <ImagePlaceholder
            tone="sage"
            description="Урлаачийн гар арьсны ирмэгийг нямбай боловсруулж буй ойрын зураг. Материалын өнгө, гарын хөдөлгөөн тод харагдана."
            number="02"
          />
        </div>
        <div className="craft-copy">
          <p className="eyebrow">02 / МАТЕРИАЛ БА УР ХИЙЦ</p>
          <h2>
            Сайн материал.
            <br />
            Сэтгэл шингэсэн ур.
            <br />
            <em>Таны түүх.</em>
          </h2>
          <p>
            Бид чанартай итали арьсыг сонгож, Монголдоо гараар урладаг. Энгийн
            атлаа өөрийн гэсэн төрхтэй, өдөр тутам хэрэглэхэд эвтэйхэн бүтээл
            хийхийг зорьдог.
          </p>
          <div className="craft-facts">
            <div>
              <span>01</span> Итали арьс
            </div>
            <div>
              <span>02</span> Гар ажиллагаа
            </div>
            <div>
              <span>03</span> Орчин үеийн загвар
            </div>
          </div>
        </div>
      </section>
      <section
        className="collection-section"
        aria-labelledby="collection-title"
      >
        <div className="collection-intro page-shell">
          <p className="eyebrow">03 / MEIRO-ГИЙН ЕРТӨНЦ</p>
          <h2 id="collection-title">
            Дэлгэрэнгүйг нь хар.
            <br />
            <em>Өөрийнхийгөө ол.</em>
          </h2>
          <p>
            Хэлбэр, өнгө, мэдрэмж.
            <br />
            Бүтээл бүрийг арай ойроос.
          </p>
        </div>
        <Carousel />
        <div className="catalogue-cta page-shell">
          <p>Таны замд хамт байх бүтээл.</p>
          <Link className="button button-primary" to="/catalogue">
            Бүх бүтээлийг үзэх <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>
    </>
  );
}
