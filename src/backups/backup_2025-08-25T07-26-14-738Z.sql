--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: sync_tanks_criticallevel(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_criticallevel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.criticallevel := NEW.critical_level;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_criticallevel() OWNER TO postgres;

--
-- Name: sync_tanks_currentlevel(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_currentlevel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.currentlevel := NEW.current_level;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_currentlevel() OWNER TO postgres;

--
-- Name: sync_tanks_productid(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_productid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.productid := NEW.product_id;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_productid() OWNER TO postgres;

--
-- Name: sync_tanks_safelevel(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_safelevel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.safelevel := NEW.safe_level;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_safelevel() OWNER TO postgres;

--
-- Name: sync_tanks_stationid(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_stationid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.stationid := NEW.station_id;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_stationid() OWNER TO postgres;

--
-- Name: sync_tanks_tanknumber(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_tanks_tanknumber() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.tanknumber := NEW.tank_number;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.sync_tanks_tanknumber() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: anomaly_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anomaly_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    tank_id uuid,
    anomaly_type character varying(50) NOT NULL,
    volume_difference numeric(10,2),
    detected_at timestamp without time zone DEFAULT now(),
    description text,
    acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp without time zone,
    resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.anomaly_alerts OWNER TO postgres;

--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(3) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    report_date date NOT NULL,
    report_no character varying(20) NOT NULL,
    generated_at timestamp without time zone DEFAULT now(),
    number_of_transactions integer DEFAULT 0,
    total_volume numeric(12,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    total_discount numeric(12,2) DEFAULT 0,
    interface_source character varying(20),
    tank_readings jsonb,
    refill_events jsonb,
    anomalies jsonb,
    raw_data jsonb,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    ewura_sent boolean DEFAULT false,
    ewura_sent_at timestamp without time zone,
    ewura_response jsonb,
    ewura_error text,
    ewura_retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.daily_reports OWNER TO postgres;

--
-- Name: districts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.districts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    region_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.districts OWNER TO postgres;

--
-- Name: ewura_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ewura_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    report_id uuid,
    submission_type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    scheduled_at timestamp without time zone DEFAULT now(),
    submitted_at timestamp without time zone,
    response_data jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ewura_queue OWNER TO postgres;

--
-- Name: ewura_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ewura_submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid,
    submission_type character varying(50) NOT NULL,
    transaction_id character varying(100),
    xml_data text NOT NULL,
    response_data text,
    status character varying(20) DEFAULT 'pending'::character varying,
    submitted_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ewura_submissions OWNER TO postgres;

--
-- Name: interface_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interface_status (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid,
    interface_type character varying(20) NOT NULL,
    is_connected boolean DEFAULT false,
    last_communication timestamp without time zone,
    error_count integer DEFAULT 0,
    last_error text,
    configuration jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.interface_status OWNER TO postgres;

--
-- Name: interface_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interface_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.interface_types OWNER TO postgres;

--
-- Name: product_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_pricing (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid,
    price numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    expiry_date date,
    station_id uuid,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_pricing OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50),
    unit character varying(20) DEFAULT 'LITERS'::character varying,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: pumps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pumps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid,
    pump_number character varying(10) NOT NULL,
    tank_id uuid,
    nozzle_count integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.pumps OWNER TO postgres;

--
-- Name: refill_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refill_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tank_id uuid,
    detected_at timestamp without time zone DEFAULT now(),
    volume_added numeric(10,2),
    volume_before numeric(10,2),
    volume_after numeric(10,2),
    estimated_cost numeric(12,2),
    temperature_before numeric(5,2),
    temperature_after numeric(5,2),
    delivery_receipt_no character varying(100),
    supplier character varying(200),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.refill_events OWNER TO postgres;

--
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    country_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.regions OWNER TO postgres;

--
-- Name: sales_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    pump_id uuid,
    tank_id uuid,
    product_id uuid,
    user_id uuid,
    interface_source character varying(20),
    transaction_id character varying(100),
    sent_to_ewura boolean DEFAULT false,
    ewura_sent_at timestamp without time zone,
    tc_volume numeric(10,3),
    fuel_grade_name character varying(50),
    efd_serial_number character varying(100),
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    volume numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50),
    receipt_number character varying(100),
    customer_name character varying(200),
    card_description character varying(100),
    created_at timestamp without time zone DEFAULT now()
)
PARTITION BY RANGE (transaction_date);


ALTER TABLE public.sales_transactions OWNER TO postgres;

--
-- Name: sales_transactions_2024; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_transactions_2024 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    pump_id uuid,
    tank_id uuid,
    product_id uuid,
    user_id uuid,
    interface_source character varying(20),
    transaction_id character varying(100),
    sent_to_ewura boolean DEFAULT false,
    ewura_sent_at timestamp without time zone,
    tc_volume numeric(10,3),
    fuel_grade_name character varying(50),
    efd_serial_number character varying(100),
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    volume numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50),
    receipt_number character varying(100),
    customer_name character varying(200),
    card_description character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_transactions_2024 OWNER TO postgres;

--
-- Name: sales_transactions_2025; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_transactions_2025 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    pump_id uuid,
    tank_id uuid,
    product_id uuid,
    user_id uuid,
    interface_source character varying(20),
    transaction_id character varying(100),
    sent_to_ewura boolean DEFAULT false,
    ewura_sent_at timestamp without time zone,
    tc_volume numeric(10,3),
    fuel_grade_name character varying(50),
    efd_serial_number character varying(100),
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    volume numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50),
    receipt_number character varying(100),
    customer_name character varying(200),
    card_description character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_transactions_2025 OWNER TO postgres;

--
-- Name: sales_transactions_2026; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_transactions_2026 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid NOT NULL,
    pump_id uuid,
    tank_id uuid,
    product_id uuid,
    user_id uuid,
    interface_source character varying(20),
    transaction_id character varying(100),
    sent_to_ewura boolean DEFAULT false,
    ewura_sent_at timestamp without time zone,
    tc_volume numeric(10,3),
    fuel_grade_name character varying(50),
    efd_serial_number character varying(100),
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    volume numeric(10,3) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50),
    receipt_number character varying(100),
    customer_name character varying(200),
    card_description character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_transactions_2026 OWNER TO postgres;

--
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    taxpayer_id uuid,
    street_id uuid,
    address text,
    coordinates point,
    ewura_license_no character varying(50),
    operational_hours jsonb,
    interface_type_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    api_key character varying(100)
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- Name: streets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.streets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    ward_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.streets OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category character varying(50) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: tank_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tank_readings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tank_id uuid NOT NULL,
    reading_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    reading_type character varying(20) DEFAULT 'REAL_TIME'::character varying,
    interface_source character varying(20),
    raw_data jsonb,
    density numeric(6,4),
    mass numeric(12,2),
    total_volume numeric(10,2),
    oil_volume numeric(10,2),
    water_volume numeric(10,2),
    tc_volume numeric(10,2),
    ullage numeric(10,2),
    oil_height numeric(10,2),
    water_height numeric(10,2),
    temperature numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
)
PARTITION BY RANGE (reading_timestamp);


ALTER TABLE public.tank_readings OWNER TO postgres;

--
-- Name: tank_readings_2024; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tank_readings_2024 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tank_id uuid NOT NULL,
    reading_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    reading_type character varying(20) DEFAULT 'REAL_TIME'::character varying,
    interface_source character varying(20),
    raw_data jsonb,
    density numeric(6,4),
    mass numeric(12,2),
    total_volume numeric(10,2),
    oil_volume numeric(10,2),
    water_volume numeric(10,2),
    tc_volume numeric(10,2),
    ullage numeric(10,2),
    oil_height numeric(10,2),
    water_height numeric(10,2),
    temperature numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tank_readings_2024 OWNER TO postgres;

--
-- Name: tank_readings_2025; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tank_readings_2025 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tank_id uuid NOT NULL,
    reading_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    reading_type character varying(20) DEFAULT 'REAL_TIME'::character varying,
    interface_source character varying(20),
    raw_data jsonb,
    density numeric(6,4),
    mass numeric(12,2),
    total_volume numeric(10,2),
    oil_volume numeric(10,2),
    water_volume numeric(10,2),
    tc_volume numeric(10,2),
    ullage numeric(10,2),
    oil_height numeric(10,2),
    water_height numeric(10,2),
    temperature numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tank_readings_2025 OWNER TO postgres;

--
-- Name: tank_readings_2026; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tank_readings_2026 (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tank_id uuid NOT NULL,
    reading_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    reading_type character varying(20) DEFAULT 'REAL_TIME'::character varying,
    interface_source character varying(20),
    raw_data jsonb,
    density numeric(6,4),
    mass numeric(12,2),
    total_volume numeric(10,2),
    oil_volume numeric(10,2),
    water_volume numeric(10,2),
    tc_volume numeric(10,2),
    ullage numeric(10,2),
    oil_height numeric(10,2),
    water_height numeric(10,2),
    temperature numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tank_readings_2026 OWNER TO postgres;

--
-- Name: tanks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tanks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid,
    tank_number character varying(10) NOT NULL,
    product_id uuid,
    capacity numeric(10,2) NOT NULL,
    safe_level numeric(10,2),
    critical_level numeric(10,2),
    current_level numeric(10,2) DEFAULT 0,
    temperature numeric(5,2),
    last_reading_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    stationid uuid,
    tanknumber character varying(10),
    productid uuid,
    safelevel numeric(10,2),
    criticallevel numeric(10,2),
    currentlevel numeric(10,2)
);


ALTER TABLE public.tanks OWNER TO postgres;

--
-- Name: taxpayers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxpayers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tin character varying(20) NOT NULL,
    vrn character varying(20),
    business_name character varying(200) NOT NULL,
    trade_name character varying(200),
    business_type character varying(50),
    registration_date date,
    street_id uuid,
    address text,
    phone character varying(20),
    email character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.taxpayers OWNER TO postgres;

--
-- Name: transaction_counts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_counts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    station_id uuid,
    hour_start timestamp without time zone NOT NULL,
    count integer DEFAULT 0,
    total_volume numeric(12,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    anomaly_detected boolean DEFAULT false,
    z_score numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.transaction_counts OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    device_serial character varying(100) NOT NULL,
    email character varying(255),
    username character varying(100),
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    user_role_id uuid,
    station_id uuid,
    interface_type_id uuid,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    district_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.wards OWNER TO postgres;

--
-- Name: sales_transactions_2024; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions ATTACH PARTITION public.sales_transactions_2024 FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');


--
-- Name: sales_transactions_2025; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions ATTACH PARTITION public.sales_transactions_2025 FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');


--
-- Name: sales_transactions_2026; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions ATTACH PARTITION public.sales_transactions_2026 FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');


--
-- Name: tank_readings_2024; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings ATTACH PARTITION public.tank_readings_2024 FOR VALUES FROM ('2024-01-01 00:00:00') TO ('2025-01-01 00:00:00');


--
-- Name: tank_readings_2025; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings ATTACH PARTITION public.tank_readings_2025 FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');


--
-- Name: tank_readings_2026; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings ATTACH PARTITION public.tank_readings_2026 FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2027-01-01 00:00:00');


--
-- Data for Name: anomaly_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anomaly_alerts (id, station_id, tank_id, anomaly_type, volume_difference, detected_at, description, acknowledged, acknowledged_by, acknowledged_at, resolved, resolved_by, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.countries (id, code, name, created_at, updated_at) FROM stdin;
930aed66-f8f5-485a-bb3f-0ba50c407e9c	TZ	Tanzania	2025-08-21 12:06:00.173022	2025-08-21 12:06:00.173022
d2514d81-85db-406e-8e24-08c5848dea47	KE	Kenya	2025-08-21 12:06:00.173022	2025-08-21 12:06:00.173022
a5ef649e-6a1e-42c4-9ea6-4710c7a3a0ec	UG	Uganda	2025-08-21 12:06:00.173022	2025-08-21 12:06:00.173022
\.


--
-- Data for Name: daily_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_reports (id, station_id, report_date, report_no, generated_at, number_of_transactions, total_volume, total_amount, total_discount, interface_source, tank_readings, refill_events, anomalies, raw_data, status, ewura_sent, ewura_sent_at, ewura_response, ewura_error, ewura_retry_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.districts (id, code, name, region_id, created_at, updated_at) FROM stdin;
fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	KIN	Kinondoni	4ce9aee1-09c9-478f-90fa-12b7ce928f89	2025-08-21 12:06:00.180703	2025-08-21 12:06:00.180703
d04a89a7-d315-4ac2-b4c3-80b334d05699	ILA	Ilala	4ce9aee1-09c9-478f-90fa-12b7ce928f89	2025-08-21 12:06:00.180703	2025-08-21 12:06:00.180703
1153b64f-c9a0-4ac8-8ede-24f5487c717d	TMK	Temeke	4ce9aee1-09c9-478f-90fa-12b7ce928f89	2025-08-21 12:06:00.180703	2025-08-21 12:06:00.180703
708aa909-1cac-44f9-a901-8b861a7deebc	UBU	Ubungo	4ce9aee1-09c9-478f-90fa-12b7ce928f89	2025-08-21 12:06:00.180703	2025-08-21 12:06:00.180703
578f6945-40d3-4aa7-819b-53c4b6fe0648	KIG	Kigamboni	4ce9aee1-09c9-478f-90fa-12b7ce928f89	2025-08-21 12:06:00.180703	2025-08-21 12:06:00.180703
\.


--
-- Data for Name: ewura_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ewura_queue (id, station_id, report_id, submission_type, payload, status, scheduled_at, submitted_at, response_data, error_message, retry_count, max_retries, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ewura_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ewura_submissions (id, station_id, submission_type, transaction_id, xml_data, response_data, status, submitted_at, created_at) FROM stdin;
\.


--
-- Data for Name: interface_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interface_status (id, station_id, interface_type, is_connected, last_communication, error_count, last_error, configuration, updated_at) FROM stdin;
\.


--
-- Data for Name: interface_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interface_types (id, code, name, description, created_at) FROM stdin;
808f7957-f3b6-425d-9628-39e84042fd49	NFPP	NFPP Interface	National Fuel Price Platform Interface	2025-08-21 12:06:00.186725
5e6c325e-1e40-4d5b-9789-ce60f1b51e26	NPGIS	NPGIS Interface	National Petroleum GIS Interface	2025-08-21 12:06:00.186725
\.


--
-- Data for Name: product_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_pricing (id, product_id, price, effective_date, expiry_date, station_id, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, category, unit, color, description, is_active, created_at, updated_at) FROM stdin;
85efe797-4f43-4d8c-9370-734c2a5d9810	PET	PETROL	FUEL	LITERS	#FF6B6B	Premium Motor Spirit	t	2025-08-21 12:06:00.188978	2025-08-21 12:06:00.188978
4b6e8d75-25d6-41e7-b684-227a77767bb2	DSL	DIESEL	FUEL	LITERS	#4ECDC4	Automotive Gas Oil	t	2025-08-21 12:06:00.188978	2025-08-21 12:06:00.188978
dde8ee99-2029-4d84-9ed8-7a4056648ad1	KER	KEROSENE	FUEL	LITERS	#45B7D1	Illuminating Kerosene	t	2025-08-21 12:06:00.188978	2025-08-21 12:06:00.188978
f04d0908-97f3-4806-bf99-88eb088ef4f8	LPG	LPG	GAS	LITERS	#96CEB4	Liquefied Petroleum Gas	t	2025-08-21 12:06:00.188978	2025-08-21 12:06:00.188978
\.


--
-- Data for Name: pumps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pumps (id, station_id, pump_number, tank_id, nozzle_count, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refill_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refill_events (id, tank_id, detected_at, volume_added, volume_before, volume_after, estimated_cost, temperature_before, temperature_after, delivery_receipt_no, supplier, notes, created_at) FROM stdin;
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regions (id, code, name, country_id, created_at, updated_at) FROM stdin;
4ce9aee1-09c9-478f-90fa-12b7ce928f89	DSM	Dar es Salaam	930aed66-f8f5-485a-bb3f-0ba50c407e9c	2025-08-21 12:06:00.177885	2025-08-21 12:06:00.177885
805cc7f8-179a-40e5-8584-da8d2394dafa	PWN	Pwani	930aed66-f8f5-485a-bb3f-0ba50c407e9c	2025-08-21 12:06:00.177885	2025-08-21 12:06:00.177885
7044b5a1-7b79-4d54-9cc4-27713e87b56b	MTW	Mtwara	930aed66-f8f5-485a-bb3f-0ba50c407e9c	2025-08-21 12:06:00.177885	2025-08-21 12:06:00.177885
22865277-48e7-448e-b2c2-e2f55b6d8643	LND	Lindi	930aed66-f8f5-485a-bb3f-0ba50c407e9c	2025-08-21 12:06:00.177885	2025-08-21 12:06:00.177885
c18cbcc1-0ab1-4244-baa3-57d8a130cbec	RUV	Ruvuma	930aed66-f8f5-485a-bb3f-0ba50c407e9c	2025-08-21 12:06:00.177885	2025-08-21 12:06:00.177885
\.


--
-- Data for Name: sales_transactions_2024; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_transactions_2024 (id, station_id, pump_id, tank_id, product_id, user_id, interface_source, transaction_id, sent_to_ewura, ewura_sent_at, tc_volume, fuel_grade_name, efd_serial_number, transaction_date, transaction_time, volume, unit_price, total_amount, discount_amount, payment_method, receipt_number, customer_name, card_description, created_at) FROM stdin;
\.


--
-- Data for Name: sales_transactions_2025; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_transactions_2025 (id, station_id, pump_id, tank_id, product_id, user_id, interface_source, transaction_id, sent_to_ewura, ewura_sent_at, tc_volume, fuel_grade_name, efd_serial_number, transaction_date, transaction_time, volume, unit_price, total_amount, discount_amount, payment_method, receipt_number, customer_name, card_description, created_at) FROM stdin;
a452c049-3ed9-42ab-baee-42ae27f5da16	d7cc43bf-4171-4057-aef0-ac560568438a	\N	\N	\N	\N	NPGIS	1	f	\N	0.000	UNLEADED	02TZ994520	2025-08-21	14:26:44	0.590	3000.00	1770.00	0.00	\N	\N		\N	2025-08-21 14:26:44.386374
\.


--
-- Data for Name: sales_transactions_2026; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_transactions_2026 (id, station_id, pump_id, tank_id, product_id, user_id, interface_source, transaction_id, sent_to_ewura, ewura_sent_at, tc_volume, fuel_grade_name, efd_serial_number, transaction_date, transaction_time, volume, unit_price, total_amount, discount_amount, payment_method, receipt_number, customer_name, card_description, created_at) FROM stdin;
\.


--
-- Data for Name: stations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stations (id, code, name, taxpayer_id, street_id, address, coordinates, ewura_license_no, operational_hours, interface_type_id, is_active, created_at, updated_at, api_key) FROM stdin;
88dc388d-df2b-4828-8f06-a43e7b6e936f	ADV001	ADVATECH FILLING STATION	09d8642a-e7cc-4e0b-b661-30e791729d8d	54e3f724-99d1-46fa-9370-d1ab07aec785	Msasani Peninsula Street, Msasani, Kinondoni, Dar es Salaam	\N	PRL-2010-715	{"friday": "06:00-22:00", "monday": "06:00-22:00", "sunday": "07:00-21:00", "tuesday": "06:00-22:00", "saturday": "06:00-22:00", "thursday": "06:00-22:00", "wednesday": "06:00-22:00"}	5e6c325e-1e40-4d5b-9789-ce60f1b51e26	t	2025-08-21 12:06:00.193329	2025-08-21 12:06:00.193329	\N
d7cc43bf-4171-4057-aef0-ac560568438a	ADV002	herimorn christon	09d8642a-e7cc-4e0b-b661-30e791729d8d	6062e5b9-fc3f-4a2a-8171-7355e8a70647	Msasani, Kinondoni, Dar es Salaam	\N	PRL-2010-715	\N	5e6c325e-1e40-4d5b-9789-ce60f1b51e26	t	2025-08-21 12:11:24.437071	2025-08-21 12:11:24.437071	ADV002_MEL6MLG4_C51ED4CFA6862D41A635725F48A416CD
\.


--
-- Data for Name: streets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.streets (id, code, name, ward_id, created_at, updated_at) FROM stdin;
54e3f724-99d1-46fa-9370-d1ab07aec785	MSA01	Msasani Peninsula Street	21018525-031f-46c4-89c7-36d0d099e5be	2025-08-21 12:06:00.185103	2025-08-21 12:06:00.185103
7e96f2eb-c43a-4d25-a249-24f9dca6a0f2	MSA02	Haile Selassie Road	21018525-031f-46c4-89c7-36d0d099e5be	2025-08-21 12:06:00.185103	2025-08-21 12:06:00.185103
4059ab44-8835-40ff-b984-61f10b1fc9b9	MSA03	Toure Drive	21018525-031f-46c4-89c7-36d0d099e5be	2025-08-21 12:06:00.185103	2025-08-21 12:06:00.185103
daa13f76-05cf-484d-840b-48f657b55119	MSA04	Slipway Road	21018525-031f-46c4-89c7-36d0d099e5be	2025-08-21 12:06:00.185103	2025-08-21 12:06:00.185103
6062e5b9-fc3f-4a2a-8171-7355e8a70647	MSA05	Peninsula Road	21018525-031f-46c4-89c7-36d0d099e5be	2025-08-21 12:06:00.185103	2025-08-21 12:06:00.185103
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, category, key, value, description, updated_by, created_at, updated_at) FROM stdin;
0067e722-d3f9-4ed2-8410-ec18d3d8d557	report_generation	generation_time	"07:30"	Daily report generation time	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.361572
e05b6054-51a6-4ae9-9d43-514a35e7cb96	backup	auto_backup	true	Enable automatic backups	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.39621
81e159d9-d086-4c33-873e-b2a1ef4e7d8e	backup	backup_location	"/backups"	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.620737	2025-08-25 10:18:21.397478
9ea25782-f1fa-4307-a0bb-c2586fa5c960	backup	backup_time	"02:00"	Daily backup time	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.398592
cf2a88e8-0f6a-4966-880a-4cd2f7bd2844	backup	retention_days	30	Backup retention period in days	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.399258
a76a3082-4d1b-4d95-b22c-5e5af2761271	monitoring	anomaly_threshold	100	Anomaly detection threshold in liters	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.369231
38d3fd29-db38-475a-9b9f-8e38d967cb11	monitoring	enable_anomaly_detection	true	Enable automatic anomaly detection	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.370161
a68b246f-292b-4a71-9218-a2446293722d	monitoring	refill_threshold	500	Refill detection threshold in liters	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.371381
9413edce-2441-4971-8bbc-64b83df5074b	monitoring	tank_poll_interval	10	Tank polling interval in seconds	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.372768
bc14feff-5fbc-40f0-bb15-fa852eafefd8	monitoring	transaction_poll_interval	300	Transaction polling interval in seconds	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.374134
faf1610d-49ff-47dd-88ae-8c738a4df8c6	interface	connection_timeout	30	Interface connection timeout in seconds	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.380255
4a358729-64ed-4807-bb4e-09bdec9fa757	interface	nfpp_enabled	true	Enable NFPP interface	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.381575
739ed477-8caa-4ab0-9508-a40ec34854b1	interface	npgis_enabled	true	Enable NPGIS interface	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.38255
5d8e7e9e-a01c-4ae6-b3aa-aa4832bd6a5e	interface	simulation_mode	false	Enable simulation mode	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.383472
51e2bb9c-8a4a-4539-ac29-1be61a438661	notifications	anomaly_alerts	true	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.614428	2025-08-25 10:18:21.388728
54b09965-7831-4a5c-b07c-c40c586c2d3b	notifications	email_enabled	true	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.609989	2025-08-25 10:18:21.389891
856cfed7-b065-49a9-9899-2ad34f8bbeb8	notifications	low_level_alerts	true	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.613348	2025-08-25 10:18:21.39092
7fd6f09d-17ed-43d5-a8a4-0421daba17de	notifications	sms_enabled	false	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.61216	2025-08-25 10:18:21.391722
418c474f-ccdc-4e58-ab7f-c386467f38bc	report_generation	timezone	"Africa/Dar_es_Salaam"	System timezone	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.353686
edb5897d-f28d-41fb-b737-1027d1cc9b74	notifications	system_alerts	true	\N	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-25 09:18:57.616096	2025-08-25 10:18:21.392638
a19cc6c2-492a-4a7a-bbbb-97c27c9fabd9	report_generation	auto_generate	true	Auto-generate daily reports	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.357573
c4f4cb56-c01d-4522-9f2e-8f4a4d31f258	report_generation	auto_send_to_ewura	true	Auto-send reports to EWURA	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.358905
85ef843e-2373-4bf4-b7d9-77253ef0b231	report_generation	ewura_send_time	"08:00"	EWURA submission time	192d0ef3-de10-433b-92d6-bd126baebd37	2025-08-21 12:06:00.15498	2025-08-25 10:18:21.360248
\.


--
-- Data for Name: tank_readings_2024; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tank_readings_2024 (id, tank_id, reading_timestamp, reading_type, interface_source, raw_data, density, mass, total_volume, oil_volume, water_volume, tc_volume, ullage, oil_height, water_height, temperature, created_at) FROM stdin;
\.


--
-- Data for Name: tank_readings_2025; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tank_readings_2025 (id, tank_id, reading_timestamp, reading_type, interface_source, raw_data, density, mass, total_volume, oil_volume, water_volume, tc_volume, ullage, oil_height, water_height, temperature, created_at) FROM stdin;
\.


--
-- Data for Name: tank_readings_2026; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tank_readings_2026 (id, tank_id, reading_timestamp, reading_type, interface_source, raw_data, density, mass, total_volume, oil_volume, water_volume, tc_volume, ullage, oil_height, water_height, temperature, created_at) FROM stdin;
\.


--
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tanks (id, station_id, tank_number, product_id, capacity, safe_level, critical_level, current_level, temperature, last_reading_at, is_active, created_at, updated_at, stationid, tanknumber, productid, safelevel, criticallevel, currentlevel) FROM stdin;
\.


--
-- Data for Name: taxpayers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxpayers (id, tin, vrn, business_name, trade_name, business_type, registration_date, street_id, address, phone, email, is_active, created_at, updated_at) FROM stdin;
09d8642a-e7cc-4e0b-b661-30e791729d8d	109272930	40005334W	ADVATECH SOLUTIONS LTD	ADVATECH FILLING STATION	RETAIL_FUEL	\N	54e3f724-99d1-46fa-9370-d1ab07aec785	Msasani Peninsula Street, Msasani, Dar es Salaam	+255754100300	info@advafuel.com	t	2025-08-21 12:06:00.19059	2025-08-21 12:06:00.19059
\.


--
-- Data for Name: transaction_counts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_counts (id, station_id, hour_start, count, total_volume, total_amount, anomaly_detected, z_score, created_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, code, name, permissions, description, created_at, updated_at) FROM stdin;
1514f227-6a6a-4275-9b34-0ebdce90103a	ADMIN	System Administrator	["*"]	Full system access	2025-08-21 12:06:00.18792	2025-08-21 12:06:00.18792
55f7f81f-e5fe-47b2-8b97-a13b7c8bd3c3	MANAGER	Station Manager	["stations.manage", "users.view", "reports.view", "tanks.manage"]	Station management access	2025-08-21 12:06:00.18792	2025-08-21 12:06:00.18792
f4a456c2-1831-4079-9059-83e48527cf53	OPERATOR	Station Operator	["tanks.view", "sales.create", "reports.view"]	Daily operations access	2025-08-21 12:06:00.18792	2025-08-21 12:06:00.18792
53fc8c81-55e9-4143-ada1-9d554d60dfb7	VIEWER	Report Viewer	["reports.view", "tanks.view"]	Read-only access	2025-08-21 12:06:00.18792	2025-08-21 12:06:00.18792
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (id, user_id, category, key, value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, device_serial, email, username, password_hash, first_name, last_name, phone, user_role_id, station_id, interface_type_id, last_login_at, password_changed_at, is_active, email_verified, created_at, updated_at) FROM stdin;
ab713476-a62f-4c54-8397-7b603abd2f5e	02TZ994520	herimornix@gmail.com	christon Mzeru	$2b$12$RXp2JLTbEhSFB7E/ivmaau/KUM7a1MPmM4/dKKIAi0ii/hCvtEJc2	herimorn	christon	\N	55f7f81f-e5fe-47b2-8b97-a13b7c8bd3c3	d7cc43bf-4171-4057-aef0-ac560568438a	\N	\N	2025-08-21 12:16:39.749251	t	f	2025-08-21 12:16:39.749251	2025-08-21 12:16:39.749251
192d0ef3-de10-433b-92d6-bd126baebd37	02TZ994528	admin@advafuel.com	admin	$2b$12$JMKxPPx/vPQIYvxu5yhRfO4sQRaOqzOvdNf1NvFNu7JskGn4C2yuy	System	Administrator	+255754100300	1514f227-6a6a-4275-9b34-0ebdce90103a	88dc388d-df2b-4828-8f06-a43e7b6e936f	5e6c325e-1e40-4d5b-9789-ce60f1b51e26	2025-08-25 07:43:58.168	2025-08-21 12:06:00.540661	t	t	2025-08-21 12:06:00.540661	2025-08-25 07:43:58.170249
\.


--
-- Data for Name: wards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wards (id, code, name, district_id, created_at, updated_at) FROM stdin;
21018525-031f-46c4-89c7-36d0d099e5be	MSA	Msasani	fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	2025-08-21 12:06:00.182973	2025-08-21 12:06:00.182973
a3ba7bf6-8bda-4738-9dcf-c33b4cbdef09	OST	Oysterbay	fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	2025-08-21 12:06:00.182973	2025-08-21 12:06:00.182973
1f144a6f-e9e2-4cdb-9e87-6b58a6fb07bc	KIN	Kinondoni	fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	2025-08-21 12:06:00.182973	2025-08-21 12:06:00.182973
275ec31a-6674-477e-9dcf-a66d4ed936c5	MKU	Mikocheni	fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	2025-08-21 12:06:00.182973	2025-08-21 12:06:00.182973
c39c5108-50eb-4db4-92ad-26e5391e7d10	MAS	Masaki	fddd9c25-4a5b-4ad3-822c-2e45b11c7b61	2025-08-21 12:06:00.182973	2025-08-21 12:06:00.182973
\.


--
-- Name: anomaly_alerts anomaly_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anomaly_alerts
    ADD CONSTRAINT anomaly_alerts_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_station_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_station_id_report_date_key UNIQUE (station_id, report_date);


--
-- Name: districts districts_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_code_key UNIQUE (code);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: ewura_queue ewura_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ewura_queue
    ADD CONSTRAINT ewura_queue_pkey PRIMARY KEY (id);


--
-- Name: ewura_submissions ewura_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ewura_submissions
    ADD CONSTRAINT ewura_submissions_pkey PRIMARY KEY (id);


--
-- Name: interface_status interface_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interface_status
    ADD CONSTRAINT interface_status_pkey PRIMARY KEY (id);


--
-- Name: interface_status interface_status_station_id_interface_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interface_status
    ADD CONSTRAINT interface_status_station_id_interface_type_key UNIQUE (station_id, interface_type);


--
-- Name: interface_types interface_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interface_types
    ADD CONSTRAINT interface_types_code_key UNIQUE (code);


--
-- Name: interface_types interface_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interface_types
    ADD CONSTRAINT interface_types_pkey PRIMARY KEY (id);


--
-- Name: product_pricing product_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_pricing
    ADD CONSTRAINT product_pricing_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: pumps pumps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_pkey PRIMARY KEY (id);


--
-- Name: pumps pumps_station_id_pump_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_station_id_pump_number_key UNIQUE (station_id, pump_number);


--
-- Name: refill_events refill_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refill_events
    ADD CONSTRAINT refill_events_pkey PRIMARY KEY (id);


--
-- Name: regions regions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_key UNIQUE (code);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: sales_transactions sales_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_pkey PRIMARY KEY (id, transaction_date);


--
-- Name: sales_transactions_2024 sales_transactions_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions_2024
    ADD CONSTRAINT sales_transactions_2024_pkey PRIMARY KEY (id, transaction_date);


--
-- Name: sales_transactions_2025 sales_transactions_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions_2025
    ADD CONSTRAINT sales_transactions_2025_pkey PRIMARY KEY (id, transaction_date);


--
-- Name: sales_transactions_2026 sales_transactions_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_transactions_2026
    ADD CONSTRAINT sales_transactions_2026_pkey PRIMARY KEY (id, transaction_date);


--
-- Name: stations stations_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_api_key_key UNIQUE (api_key);


--
-- Name: stations stations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_code_key UNIQUE (code);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: streets streets_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streets
    ADD CONSTRAINT streets_code_key UNIQUE (code);


--
-- Name: streets streets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streets
    ADD CONSTRAINT streets_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_category_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_category_key_key UNIQUE (category, key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tank_readings tank_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings
    ADD CONSTRAINT tank_readings_pkey PRIMARY KEY (id, reading_timestamp);


--
-- Name: tank_readings_2024 tank_readings_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2024
    ADD CONSTRAINT tank_readings_2024_pkey PRIMARY KEY (id, reading_timestamp);


--
-- Name: tank_readings tank_readings_tank_id_reading_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings
    ADD CONSTRAINT tank_readings_tank_id_reading_timestamp_key UNIQUE (tank_id, reading_timestamp);


--
-- Name: tank_readings_2024 tank_readings_2024_tank_id_reading_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2024
    ADD CONSTRAINT tank_readings_2024_tank_id_reading_timestamp_key UNIQUE (tank_id, reading_timestamp);


--
-- Name: tank_readings_2025 tank_readings_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2025
    ADD CONSTRAINT tank_readings_2025_pkey PRIMARY KEY (id, reading_timestamp);


--
-- Name: tank_readings_2025 tank_readings_2025_tank_id_reading_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2025
    ADD CONSTRAINT tank_readings_2025_tank_id_reading_timestamp_key UNIQUE (tank_id, reading_timestamp);


--
-- Name: tank_readings_2026 tank_readings_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2026
    ADD CONSTRAINT tank_readings_2026_pkey PRIMARY KEY (id, reading_timestamp);


--
-- Name: tank_readings_2026 tank_readings_2026_tank_id_reading_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tank_readings_2026
    ADD CONSTRAINT tank_readings_2026_tank_id_reading_timestamp_key UNIQUE (tank_id, reading_timestamp);


--
-- Name: tanks tanks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_pkey PRIMARY KEY (id);


--
-- Name: tanks tanks_station_id_tank_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_station_id_tank_number_key UNIQUE (station_id, tank_number);


--
-- Name: taxpayers taxpayers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxpayers
    ADD CONSTRAINT taxpayers_pkey PRIMARY KEY (id);


--
-- Name: taxpayers taxpayers_tin_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxpayers
    ADD CONSTRAINT taxpayers_tin_key UNIQUE (tin);


--
-- Name: transaction_counts transaction_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_counts
    ADD CONSTRAINT transaction_counts_pkey PRIMARY KEY (id);


--
-- Name: transaction_counts transaction_counts_station_id_hour_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_counts
    ADD CONSTRAINT transaction_counts_station_id_hour_start_key UNIQUE (station_id, hour_start);


--
-- Name: user_roles user_roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_code_key UNIQUE (code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_category_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_category_key_key UNIQUE (user_id, category, key);


--
-- Name: users users_device_serial_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_device_serial_key UNIQUE (device_serial);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wards wards_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_code_key UNIQUE (code);


--
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- Name: idx_anomaly_alerts_station_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_anomaly_alerts_station_date ON public.anomaly_alerts USING btree (station_id, detected_at);


--
-- Name: idx_daily_reports_ewura_sent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_reports_ewura_sent ON public.daily_reports USING btree (ewura_sent, status);


--
-- Name: idx_daily_reports_station_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_reports_station_date ON public.daily_reports USING btree (station_id, report_date);


--
-- Name: idx_ewura_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ewura_queue_status ON public.ewura_queue USING btree (status, scheduled_at);


--
-- Name: idx_ewura_submissions_station; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ewura_submissions_station ON public.ewura_submissions USING btree (station_id, submission_type);


--
-- Name: idx_sales_station_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_station_date ON ONLY public.sales_transactions USING btree (station_id, transaction_date);


--
-- Name: idx_stations_api_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stations_api_key ON public.stations USING btree (api_key) WHERE (api_key IS NOT NULL);


--
-- Name: idx_system_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);


--
-- Name: idx_tank_readings_interface_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tank_readings_interface_source ON ONLY public.tank_readings USING btree (interface_source, reading_timestamp DESC);


--
-- Name: idx_tank_readings_tank_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tank_readings_tank_time ON ONLY public.tank_readings USING btree (tank_id, reading_timestamp DESC);


--
-- Name: idx_user_settings_user_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_settings_user_category ON public.user_settings USING btree (user_id, category);


--
-- Name: idx_users_device_serial_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_device_serial_unique ON public.users USING btree (device_serial);


--
-- Name: sales_transactions_2024_station_id_transaction_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_transactions_2024_station_id_transaction_date_idx ON public.sales_transactions_2024 USING btree (station_id, transaction_date);


--
-- Name: ux_sales_txid_per_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_sales_txid_per_day ON ONLY public.sales_transactions USING btree (station_id, transaction_id, transaction_date) WHERE (transaction_id IS NOT NULL);


--
-- Name: sales_transactions_2024_station_id_transaction_id_transacti_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_transactions_2024_station_id_transaction_id_transacti_idx ON public.sales_transactions_2024 USING btree (station_id, transaction_id, transaction_date) WHERE (transaction_id IS NOT NULL);


--
-- Name: sales_transactions_2025_station_id_transaction_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_transactions_2025_station_id_transaction_date_idx ON public.sales_transactions_2025 USING btree (station_id, transaction_date);


--
-- Name: sales_transactions_2025_station_id_transaction_id_transacti_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_transactions_2025_station_id_transaction_id_transacti_idx ON public.sales_transactions_2025 USING btree (station_id, transaction_id, transaction_date) WHERE (transaction_id IS NOT NULL);


--
-- Name: sales_transactions_2026_station_id_transaction_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_transactions_2026_station_id_transaction_date_idx ON public.sales_transactions_2026 USING btree (station_id, transaction_date);


--
-- Name: sales_transactions_2026_station_id_transaction_id_transacti_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_transactions_2026_station_id_transaction_id_transacti_idx ON public.sales_transactions_2026 USING btree (station_id, transaction_id, transaction_date) WHERE (transaction_id IS NOT NULL);


--
-- Name: tank_readings_2024_interface_source_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2024_interface_source_reading_timestamp_idx ON public.tank_readings_2024 USING btree (interface_source, reading_timestamp DESC);


--
-- Name: tank_readings_2024_tank_id_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2024_tank_id_reading_timestamp_idx ON public.tank_readings_2024 USING btree (tank_id, reading_timestamp DESC);


--
-- Name: tank_readings_2025_interface_source_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2025_interface_source_reading_timestamp_idx ON public.tank_readings_2025 USING btree (interface_source, reading_timestamp DESC);


--
-- Name: tank_readings_2025_tank_id_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2025_tank_id_reading_timestamp_idx ON public.tank_readings_2025 USING btree (tank_id, reading_timestamp DESC);


--
-- Name: tank_readings_2026_interface_source_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2026_interface_source_reading_timestamp_idx ON public.tank_readings_2026 USING btree (interface_source, reading_timestamp DESC);


--
-- Name: tank_readings_2026_tank_id_reading_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tank_readings_2026_tank_id_reading_timestamp_idx ON public.tank_readings_2026 USING btree (tank_id, reading_timestamp DESC);


--
-- Name: sales_transactions_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.sales_transactions_pkey ATTACH PARTITION public.sales_transactions_2024_pkey;


--
-- Name: sales_transactions_2024_station_id_transaction_date_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_sales_station_date ATTACH PARTITION public.sales_transactions_2024_station_id_transaction_date_idx;


--
-- Name: sales_transactions_2024_station_id_transaction_id_transacti_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.ux_sales_txid_per_day ATTACH PARTITION public.sales_transactions_2024_station_id_transaction_id_transacti_idx;


--
-- Name: sales_transactions_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.sales_transactions_pkey ATTACH PARTITION public.sales_transactions_2025_pkey;


--
-- Name: sales_transactions_2025_station_id_transaction_date_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_sales_station_date ATTACH PARTITION public.sales_transactions_2025_station_id_transaction_date_idx;


--
-- Name: sales_transactions_2025_station_id_transaction_id_transacti_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.ux_sales_txid_per_day ATTACH PARTITION public.sales_transactions_2025_station_id_transaction_id_transacti_idx;


--
-- Name: sales_transactions_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.sales_transactions_pkey ATTACH PARTITION public.sales_transactions_2026_pkey;


--
-- Name: sales_transactions_2026_station_id_transaction_date_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_sales_station_date ATTACH PARTITION public.sales_transactions_2026_station_id_transaction_date_idx;


--
-- Name: sales_transactions_2026_station_id_transaction_id_transacti_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.ux_sales_txid_per_day ATTACH PARTITION public.sales_transactions_2026_station_id_transaction_id_transacti_idx;


--
-- Name: tank_readings_2024_interface_source_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_interface_source ATTACH PARTITION public.tank_readings_2024_interface_source_reading_timestamp_idx;


--
-- Name: tank_readings_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_pkey ATTACH PARTITION public.tank_readings_2024_pkey;


--
-- Name: tank_readings_2024_tank_id_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_tank_time ATTACH PARTITION public.tank_readings_2024_tank_id_reading_timestamp_idx;


--
-- Name: tank_readings_2024_tank_id_reading_timestamp_key; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_tank_id_reading_timestamp_key ATTACH PARTITION public.tank_readings_2024_tank_id_reading_timestamp_key;


--
-- Name: tank_readings_2025_interface_source_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_interface_source ATTACH PARTITION public.tank_readings_2025_interface_source_reading_timestamp_idx;


--
-- Name: tank_readings_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_pkey ATTACH PARTITION public.tank_readings_2025_pkey;


--
-- Name: tank_readings_2025_tank_id_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_tank_time ATTACH PARTITION public.tank_readings_2025_tank_id_reading_timestamp_idx;


--
-- Name: tank_readings_2025_tank_id_reading_timestamp_key; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_tank_id_reading_timestamp_key ATTACH PARTITION public.tank_readings_2025_tank_id_reading_timestamp_key;


--
-- Name: tank_readings_2026_interface_source_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_interface_source ATTACH PARTITION public.tank_readings_2026_interface_source_reading_timestamp_idx;


--
-- Name: tank_readings_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_pkey ATTACH PARTITION public.tank_readings_2026_pkey;


--
-- Name: tank_readings_2026_tank_id_reading_timestamp_idx; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.idx_tank_readings_tank_time ATTACH PARTITION public.tank_readings_2026_tank_id_reading_timestamp_idx;


--
-- Name: tank_readings_2026_tank_id_reading_timestamp_key; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX public.tank_readings_tank_id_reading_timestamp_key ATTACH PARTITION public.tank_readings_2026_tank_id_reading_timestamp_key;


--
-- Name: tanks trg_sync_tanks_criticallevel; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_criticallevel BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_criticallevel();


--
-- Name: tanks trg_sync_tanks_currentlevel; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_currentlevel BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_currentlevel();


--
-- Name: tanks trg_sync_tanks_productid; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_productid BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_productid();


--
-- Name: tanks trg_sync_tanks_safelevel; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_safelevel BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_safelevel();


--
-- Name: tanks trg_sync_tanks_stationid; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_stationid BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_stationid();


--
-- Name: tanks trg_sync_tanks_tanknumber; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_tanks_tanknumber BEFORE INSERT OR UPDATE ON public.tanks FOR EACH ROW EXECUTE FUNCTION public.sync_tanks_tanknumber();


--
-- Name: anomaly_alerts anomaly_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anomaly_alerts
    ADD CONSTRAINT anomaly_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: anomaly_alerts anomaly_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anomaly_alerts
    ADD CONSTRAINT anomaly_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: anomaly_alerts anomaly_alerts_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anomaly_alerts
    ADD CONSTRAINT anomaly_alerts_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: anomaly_alerts anomaly_alerts_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anomaly_alerts
    ADD CONSTRAINT anomaly_alerts_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: daily_reports daily_reports_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: districts districts_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: ewura_queue ewura_queue_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ewura_queue
    ADD CONSTRAINT ewura_queue_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id);


--
-- Name: ewura_queue ewura_queue_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ewura_queue
    ADD CONSTRAINT ewura_queue_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: ewura_submissions ewura_submissions_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ewura_submissions
    ADD CONSTRAINT ewura_submissions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: interface_status interface_status_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interface_status
    ADD CONSTRAINT interface_status_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: product_pricing product_pricing_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_pricing
    ADD CONSTRAINT product_pricing_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: product_pricing product_pricing_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_pricing
    ADD CONSTRAINT product_pricing_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_pricing product_pricing_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_pricing
    ADD CONSTRAINT product_pricing_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: pumps pumps_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: pumps pumps_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: refill_events refill_events_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refill_events
    ADD CONSTRAINT refill_events_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: regions regions_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: sales_transactions sales_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_transactions
    ADD CONSTRAINT sales_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_transactions sales_transactions_pump_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_transactions
    ADD CONSTRAINT sales_transactions_pump_id_fkey FOREIGN KEY (pump_id) REFERENCES public.pumps(id);


--
-- Name: sales_transactions sales_transactions_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_transactions
    ADD CONSTRAINT sales_transactions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: sales_transactions sales_transactions_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_transactions
    ADD CONSTRAINT sales_transactions_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: sales_transactions sales_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_transactions
    ADD CONSTRAINT sales_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stations stations_interface_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_interface_type_id_fkey FOREIGN KEY (interface_type_id) REFERENCES public.interface_types(id);


--
-- Name: stations stations_street_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_street_id_fkey FOREIGN KEY (street_id) REFERENCES public.streets(id);


--
-- Name: stations stations_taxpayer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_taxpayer_id_fkey FOREIGN KEY (taxpayer_id) REFERENCES public.taxpayers(id);


--
-- Name: streets streets_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streets
    ADD CONSTRAINT streets_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: tank_readings tank_readings_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.tank_readings
    ADD CONSTRAINT tank_readings_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: tanks tanks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: tanks tanks_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: taxpayers taxpayers_street_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxpayers
    ADD CONSTRAINT taxpayers_street_id_fkey FOREIGN KEY (street_id) REFERENCES public.streets(id);


--
-- Name: transaction_counts transaction_counts_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_counts
    ADD CONSTRAINT transaction_counts_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_interface_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_interface_type_id_fkey FOREIGN KEY (interface_type_id) REFERENCES public.interface_types(id);


--
-- Name: users users_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: users users_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_roles(id);


--
-- Name: wards wards_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- PostgreSQL database dump complete
--

