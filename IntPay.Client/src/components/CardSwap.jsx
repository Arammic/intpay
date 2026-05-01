import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import "./CardSwap.css";

export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card ${customClass ?? ""} ${rest.className ?? ""}`.trim()} />
));
Card.displayName = "Card";

const makeSlot = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});

const placeNow = (el, slot, skew) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });

const CardSwap = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  autoPlay = false,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  dragThreshold = 80,
  easing = "elastic",
  children,
}) => {
  const config =
    easing === "elastic"
      ? {
          ease: "elastic.out(0.6,0.9)",
          durDrop: 2,
          durMove: 2,
          durReturn: 2,
          promoteOverlap: 0.9,
          returnDelay: 0.05,
        }
      : {
          ease: "power1.inOut",
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2,
        };

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length],
  );

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));
  const tlRef = useRef(null);
  const intervalRef = useRef();
  const container = useRef(null);
  const activeDragIdxRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);

  const runSwap = () => {
    if (order.current.length < 2) return;
    const [front, ...rest] = order.current;
    const elFront = refs[front]?.current;
    if (!elFront) return;
    const tl = gsap.timeline();
    tlRef.current = tl;

    tl.to(elFront, { y: "+=500", duration: config.durDrop, ease: config.ease });

    tl.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);
    rest.forEach((idx, i) => {
      const el = refs[idx]?.current;
      if (!el) return;
      const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
      tl.set(el, { zIndex: slot.zIndex }, "promote");
      tl.to(
        el,
        { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease },
        `promote+=${i * 0.15}`,
      );
    });

    const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
    tl.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
    tl.call(() => {
      gsap.set(elFront, { zIndex: backSlot.zIndex });
    }, undefined, "return");
    tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, "return");
    tl.call(() => {
      order.current = [...rest, front];
    });
  };

  useEffect(() => {
    const total = refs.length;
    refs.forEach((r, i) => placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount));
    if (autoPlay) {
      runSwap();
      intervalRef.current = window.setInterval(runSwap, delay);
    }

    if (autoPlay && pauseOnHover) {
      const node = container.current;
      const pause = () => {
        tlRef.current?.pause();
        clearInterval(intervalRef.current);
      };
      const resume = () => {
        tlRef.current?.play();
        intervalRef.current = window.setInterval(runSwap, delay);
      };
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
      return () => {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
        clearInterval(intervalRef.current);
      };
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, autoPlay, pauseOnHover, skewAmount, easing]);

  const onCardPointerDown = (idx, e) => {
    if (idx !== order.current[0]) return;
    activeDragIdxRef.current = idx;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragMovedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onCardPointerMove = (idx, e) => {
    if (activeDragIdxRef.current !== idx || idx !== order.current[0]) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragMovedRef.current = true;
    const slot0 = makeSlot(0, cardDistance, verticalDistance, refs.length);
    gsap.set(refs[idx].current, { x: slot0.x + dx, y: slot0.y + dy });
  };

  const onCardPointerUp = (idx) => {
    if (activeDragIdxRef.current !== idx || idx !== order.current[0]) return;
    const el = refs[idx].current;
    const slot0 = makeSlot(0, cardDistance, verticalDistance, refs.length);
    const x = Number(gsap.getProperty(el, "x"));
    const y = Number(gsap.getProperty(el, "y"));
    const dx = x - slot0.x;
    const dy = y - slot0.y;
    activeDragIdxRef.current = null;
    if (Math.hypot(dx, dy) >= dragThreshold) {
      runSwap();
      return;
    }
    gsap.to(el, { x: slot0.x, y: slot0.y, duration: 0.25, ease: "power2.out" });
  };

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onPointerDown: (e) => {
            child.props.onPointerDown?.(e);
            onCardPointerDown(i, e);
          },
          onPointerMove: (e) => {
            child.props.onPointerMove?.(e);
            onCardPointerMove(i, e);
          },
          onPointerUp: (e) => {
            child.props.onPointerUp?.(e);
            onCardPointerUp(i);
          },
          onClick: (e) => {
            child.props.onClick?.(e);
            if (dragMovedRef.current) return;
            onCardClick?.(i);
          },
        })
      : child,
  );

  return (
    <div ref={container} className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
};

export default CardSwap;
