import React from "react";
import { Link } from "react-router-dom";

const Logo = ({ size = 64 }) => (
  <Link to="/" className="flex items-center justify-center">
    <img
      src="/philsca_logo.png"
      alt="PhilSCA Logo"
      style={{ width: size, height: size }}
      className="object-contain"
    />
  </Link>
);

export default Logo;
