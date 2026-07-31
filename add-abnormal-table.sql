-- 异常乘客记录表
CREATE TABLE IF NOT EXISTS abnormal_passengers (
  id SERIAL PRIMARY KEY,
  station VARCHAR(50) NOT NULL,
  occur_time VARCHAR(50),
  name VARCHAR(50),
  gender VARCHAR(10),
  abnormal_behavior TEXT,
  phone VARCHAR(20),
  citizen_card VARCHAR(50),
  common_exit VARCHAR(20),
  has_family VARCHAR(10),
  help_type VARCHAR(50),
  photo_url TEXT,
  incident_desc TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
