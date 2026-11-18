import type { AuthMode } from "../App";

type HomePageProps = {
  onExplore: () => void;
  onAuthOpen: (mode: AuthMode) => void;
};

export const HomePage = ({ onExplore, onAuthOpen }: HomePageProps) => (
  <>
    <section className="mx-auto grid min-h-[605px] max-w-[1240px] grid-cols-[1fr_0.95fr] items-center gap-[65px] px-[70px] pb-[90px] pt-[78px]">
      <div className="max-w-[540px]">
        <span className="eyebrow">A better way forward</span>
        <h1
          className="mb-[22px] max-w-[520px] text-[64px] font-semibold leading-[1.02] tracking-[-2px] text-[var(--ink)]"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          Good guidance changes{" "}
          <em className="text-[var(--green)] italic">everything.</em>
        </h1>
        <p className="max-w-[430px] text-base leading-[1.65] text-[var(--muted)]">
          Find a mentor who gets where you are and knows how to help you get
          where you want to be.
        </p>

        <div className="mt-[30px] mb-[46px] flex items-center gap-[26px]">
          <button
            className="inline-flex items-center justify-center gap-2.5 rounded-[2px] border border-[var(--green)] bg-[var(--green)] px-[22px] py-[16px] text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#315442]"
            type="button"
            onClick={onExplore}
          >
            Find your mentor <span aria-hidden="true">↗</span>
          </button>
          <button
            className="border-0 bg-transparent px-0 py-[8px] text-[13px] font-semibold text-[var(--ink)]"
            type="button"
            onClick={() => onAuthOpen("signup")}
          >
            Become a mentor{" "}
            <span className="ml-[5px] text-[var(--green)]" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        <div className="flex items-center gap-[13px]">
          <div className="flex items-center">
            <img
              className="-ml-[7px] h-[29px] w-[29px] rounded-full border-2 border-[var(--paper)] object-cover first:ml-0"
              src="https://i.pravatar.cc/64?img=5"
              alt=""
            />
            <img
              className="-ml-[7px] h-[29px] w-[29px] rounded-full border-2 border-[var(--paper)] object-cover first:ml-0"
              src="https://i.pravatar.cc/64?img=9"
              alt=""
            />
            <img
              className="-ml-[7px] h-[29px] w-[29px] rounded-full border-2 border-[var(--paper)] object-cover first:ml-0"
              src="https://i.pravatar.cc/64?img=25"
              alt=""
            />
            <span className="ml-[-7px] grid h-[29px] w-[29px] place-items-center rounded-full border-2 border-[var(--paper)] bg-[#e5eadf] text-[13px] font-bold text-[var(--green)]">
              +
            </span>
          </div>
          <p className="m-0 text-[12px] text-[var(--muted)]">
            <strong className="text-[var(--ink)]">4,000+</strong> people finding
            their next step
          </p>
        </div>
      </div>

      <div
        className="relative w-full max-w-[500px] justify-self-end"
        aria-label="A mentor and mentee talking over coffee"
      >
        <div className="absolute -right-[15px] -top-[26px] z-0 h-[280px] w-[280px] rounded-full bg-[var(--lime)]" />
        <img
          className="relative z-[1] ml-auto block aspect-[1/1.04] w-[83%] object-cover saturate-75"
          src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85"
          alt="Two colleagues having a conversation"
        />
        <div className="absolute bottom-[-25px] left-0 z-[2] flex items-center gap-[12px] bg-[var(--green)] px-[20px] py-[16px] text-white shadow-[10px_12px_0_rgba(66,107,89,0.16)]">
          <span className="text-[21px] text-[var(--lime)]">✦</span>
          <p className="m-0 text-[12px] leading-[1.45] text-white">
            Real experience.
            <br />
            <strong className="text-[14px]">Real momentum.</strong>
          </p>
        </div>
      </div>
    </section>

    <section className="border-y border-[var(--line)] px-8 py-[27px] text-center">
      <p className="mb-[18px] text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        Trusted by people building what comes next
      </p>
      <div className="mx-auto flex max-w-[850px] items-center justify-between text-[18px] font-bold text-[var(--muted)]">
        <strong>Vercel</strong>
        <strong>airbnb</strong>
        <strong>Notion</strong>
        <strong>hubspot</strong>
        <strong>Webflow</strong>
      </div>
    </section>

    <section
      className="mx-auto grid max-w-[1100px] grid-cols-[0.8fr_1.2fr] gap-[80px] px-8 py-[105px] pb-[125px]"
      id="how-it-works"
    >
      <div>
        <span className="eyebrow">Simple by design</span>
        <h2
          className="m-0 text-[39px] font-medium leading-[1.1] text-[var(--ink)]"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          One conversation
          <br />
          <em className="text-[var(--green)] italic">can shift a lot.</em>
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-[30px]">
        <div className="border-t border-[var(--line)] pt-[15px]">
          <span className="text-[11px] font-semibold text-[var(--green)]">
            01
          </span>
          <h3 className="my-[38px] mb-[10px] text-[14px] font-semibold text-[var(--ink)]">
            Tell us your direction
          </h3>
          <p className="text-[12px] leading-[1.6] text-[var(--muted)]">
            Share what you are working toward, and where you feel stuck.
          </p>
        </div>
        <div className="border-t border-[var(--line)] pt-[15px]">
          <span className="text-[11px] font-semibold text-[var(--green)]">
            02
          </span>
          <h3 className="my-[38px] mb-[10px] text-[14px] font-semibold text-[var(--ink)]">
            Meet your match
          </h3>
          <p className="text-[12px] leading-[1.6] text-[var(--muted)]">
            Browse people with the experience and perspective you need.
          </p>
        </div>
        <div className="border-t border-[var(--line)] pt-[15px]">
          <span className="text-[11px] font-semibold text-[var(--green)]">
            03
          </span>
          <h3 className="my-[38px] mb-[10px] text-[14px] font-semibold text-[var(--ink)]">
            Make your move
          </h3>
          <p className="text-[12px] leading-[1.6] text-[var(--muted)]">
            Have a focused conversation, then leave with a clear next step.
          </p>
        </div>
      </div>
    </section>
  </>
);
