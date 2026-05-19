const IMAGES = [
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/kaqAY1nkuUkH0VM2d7XW9DmosCOzeRcAP6EY2s8U.jpg",
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/GDKBpQtP5RTNkjCsAZWtkg9jzRWhSAhwrLvjsKZs.png",
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/Dnz9N9joKAFzN0PKI3xbS6YcMLQsRBgdXoc9EEHI.jpg",
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/miJAnzedaCMvf8ytj3VbuIeLfi52OSpHAwPkYuBt.jpg",
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/ER8bhu3fPcvTHAG7AiV8kuGMjWcKh7DszcPJkJfi.png",
  "https://salla-dev-portal.s3.eu-central-1.amazonaws.com/uploads/LYMMXQoFllUIv3JhQOS1lkTTruiXfIfKJXEifeIo.jpg",
];

function Column({
  reverse,
  durationSec,
  delaySec,
}: {
  reverse?: boolean;
  durationSec: number;
  delaySec?: number;
}) {
  const list = [...IMAGES, ...IMAGES];
  return (
    <div className="relative h-[200px] md:h-[280px] overflow-hidden">
      <div
        className={`marquee-wrapper ${reverse ? "reverse" : ""}`}
        style={{
          animationDelay: `${delaySec ?? 0}s`,
        }}
      >
        <div
          className="marquee"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {list.map((src, i) => (
            <div
              key={i}
              className="w-full mb-4 rounded-xl overflow-hidden border"
            >
              <img src={src} alt={`marquee-${i}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarqueeColumns() {
  return (
    <>
      <style>{`
        .marquee-wrapper {
          height: 100%;
          overflow: hidden;
        }
        .marquee {
          display: flex;
          flex-direction: column;
          animation-name: marqueeY;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .marquee-wrapper.reverse .marquee {
          animation-name: marqueeYReverse;
        }
        @keyframes marqueeY {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marqueeYReverse {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <div className="grid grid-cols-3 gap-4 w-full">
        <Column durationSec={160} />
        <Column reverse durationSec={140} delaySec={5} />
        <Column durationSec={180} />
      </div>
    </>
  );
}
