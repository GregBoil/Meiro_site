import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";

const slides = [
  {
    title: "Таны өдөр тутмын нэг хэсэг.",
    description:
      "Арьсан цүнх үүрсэн хүн хотын гудамжаар алхаж буй агшин. Энгийн хувцаслалт, байгалийн гэрэл.",
    tone: "taupe",
  },
  {
    title: "Ширхэг бүр өөрийн түүхтэй.",
    description:
      "Итали арьсны байгалийн ширхэгийг харуулсан маш ойрын зураг. Дулаан өнгө, хажуугийн гэрэл.",
    tone: "clay",
  },
  {
    title: "Жижиг зүйлд ч сэтгэл бий.",
    description:
      "Гараар хийсэн нарийн оёдол, цэвэрхэн боловсруулсан ирмэг. Ойрын, тод зураг.",
    tone: "sage",
  },
  {
    title: "Хаашаа ч явсан, хамт.",
    description:
      "Арьсан түрийвч, дэвтэр цайвар ширээн дээр. Өдөр тутмын тайван орчин.",
    tone: "sand",
  },
  {
    title: "Бидний гараас, танд.",
    description:
      "Урлаач арьсан дээр Meiro-гийн тэмдэг дарж буй агшин. Гар, материалд төвлөрсөн зураг.",
    tone: "rose",
  },
];

export default function Carousel() {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [interacting, setInteracting] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (paused || interacting) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      if (!element || document.hidden) return;
      const last =
        element.scrollLeft >= element.scrollWidth - element.clientWidth - 4;
      element.scrollTo({
        left: last ? 0 : element.scrollLeft + element.clientWidth * 0.72,
        behavior: "smooth",
      });
    }, 5500);
    return () => window.clearInterval(timer);
  }, [paused, interacting]);

  function move(direction: number) {
    setPaused(true);
    const element = track.current;
    if (!element) return;
    const slide = element.querySelector("figure");
    element.scrollBy({
      left: direction * ((slide?.clientWidth ?? 400) + 24),
      behavior: "smooth",
    });
  }

  return (
    <div
      className="collection-carousel"
      role="group"
      aria-label="Бүтээлүүдийн ертөнц"
    >
      <div className="collection-heading">
        <p className="eyebrow">ОЙРООС ХАРВАЛ</p>
        <div className="carousel-controls">
          <span className="slide-count">
            0{active + 1} <span>/ 05</span>
          </span>
          <button
            className="icon-button"
            onClick={() => setPaused(!paused)}
            aria-label={
              paused ? "Автомат гүйлгэх" : "Автомат гүйлгэлтийг зогсоох"
            }
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            className="icon-button"
            onClick={() => move(-1)}
            aria-label="Өмнөх зураг"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => move(1)}
            aria-label="Дараагийн зураг"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div
        className="carousel-track"
        ref={track}
        tabIndex={0}
        aria-label="Зургуудыг хажуу тийш гүйлгэж үзнэ үү"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocus={() => setInteracting(true)}
        onBlur={() => setInteracting(false)}
        onTouchStart={() => setPaused(true)}
        onWheel={() => setPaused(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onScroll={() => {
          const element = track.current;
          const width = element?.querySelector("figure")?.clientWidth ?? 1;
          if (
            element &&
            element.scrollLeft >= element.scrollWidth - element.clientWidth - 4
          ) {
            setActive(slides.length - 1);
            return;
          }
          setActive(
            Math.min(
              slides.length - 1,
              Math.round((element?.scrollLeft ?? 0) / (width + 24)),
            ),
          );
        }}
      >
        {slides.map((slide, index) => (
          <figure key={slide.title}>
            <ImagePlaceholder
              description={slide.description}
              tone={slide.tone}
              number={`0${index + 1}`}
            />
            <figcaption>
              <span>{slide.title}</span>
              <span>0{index + 1}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
