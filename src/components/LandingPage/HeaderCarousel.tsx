import React from "react";
import Slider from "react-slick";

interface CarouselItem {
  type: 'text' | 'video';
  content: string;
  description?: string;
}

interface HeaderCarouselProps {
  items: CarouselItem[];
}

const HeaderCarousel: React.FC<HeaderCarouselProps> = ({ items }) => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0auto' }}><Slider {...settings}>
      {items.map((item, index) => (
        <div key={index}>
          {item.type === 'text' ? (
            <div><h2>{item.content}</h2>
              {item.description && <p>{item.description}</p>}
            </div>
          ) : (
            <div><video
              width="100%"
              controls
              src={item.content}
              style={{ borderRadius: '10px' }}
            />
              {item.description && <p>{item.description}</p>}
            </div>
          )}
        </div>
      ))}
    </Slider></div>
  );
};

export default HeaderCarousel;
