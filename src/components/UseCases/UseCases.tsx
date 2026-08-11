import Link from "@docusaurus/Link";
import { useHistory, useLocation } from "@docusaurus/router";
import {
  faArrowRight,
  faBolt,
  faFileShield,
  faGlobe,
  faHardDrive,
  faMemory,
  faRoute,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

import styles from "./UseCases.module.css";

const useCaseIcons = {
  globe: faGlobe,
  memory: faMemory,
  bolt: faBolt,
  "hard-drive": faHardDrive,
  route: faRoute,
  "file-shield": faFileShield,
};

const facetDefinitions = [
  {
    key: "platforms",
    label: "Platform",
    param: "platform",
    options: {
      kubernetes: "Kubernetes",
      linux: "Linux",
    },
  },
  {
    key: "signals",
    label: "Signal",
    param: "signal",
    options: {
      events: "Events",
      metrics: "Metrics",
      profiles: "Profiles",
    },
  },
  {
    key: "integrations",
    label: "Integration",
    param: "integration",
    options: {
      cli: "CLI",
      opentelemetry: "OpenTelemetry",
      prometheus: "Prometheus",
      pyroscope: "Pyroscope",
    },
  },
  {
    key: "domains",
    label: "Domain",
    param: "domain",
    options: {
      networking: "Networking",
      performance: "Performance",
      security: "Security",
      reliability: "Reliability",
    },
  },
  {
    key: "methods",
    label: "Method",
    param: "method",
    options: {
      trace: "Trace",
      profile: "Profile",
      top: "Top",
      audit: "Audit",
      advise: "Advise",
    },
  },
] as const;

type FacetDefinition = (typeof facetDefinitions)[number];
type FacetKey = FacetDefinition["key"];

export interface UseCase {
  title: string;
  description: string;
  permalink: string;
  gadget: string;
  icon: keyof typeof useCaseIcons;
  platforms: string[];
  signals: string[];
  integrations: string[];
  domains: string[];
  methods: string[];
}

interface UseCasesProps {
  useCases: UseCase[];
}

function parseSelection(
  searchParams: URLSearchParams,
  facet: FacetDefinition,
): string[] {
  const allowedOptions = Object.keys(facet.options);
  return (searchParams.get(facet.param) ?? "")
    .split(",")
    .filter((value) => allowedOptions.includes(value));
}

function matchesSearch(useCase: UseCase, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchableText = [
    useCase.title,
    useCase.description,
    useCase.gadget,
    ...useCase.platforms,
    ...useCase.signals,
    ...useCase.integrations,
    ...useCase.domains,
    ...useCase.methods,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function matchesFacets(
  useCase: UseCase,
  selections: Record<FacetKey, string[]>,
  ignoredFacet?: FacetKey,
): boolean {
  return facetDefinitions.every((facet) => {
    if (facet.key === ignoredFacet || selections[facet.key].length === 0) {
      return true;
    }

    return selections[facet.key].some((value) =>
      useCase[facet.key].includes(value),
    );
  });
}

export function UseCases({ useCases }: UseCasesProps) {
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get("q") ?? "";
  const selections = Object.fromEntries(
    facetDefinitions.map((facet) => [
      facet.key,
      parseSelection(searchParams, facet),
    ]),
  ) as Record<FacetKey, string[]>;

  const updateSearchParams = (nextParams: URLSearchParams) => {
    const search = nextParams.toString();
    history.replace(
      `${location.pathname}${search ? `?${search}` : ""}${location.hash}`,
    );
  };

  const updateQuery = (value: string) => {
    const nextParams = new URLSearchParams(location.search);
    if (value) {
      nextParams.set("q", value);
    } else {
      nextParams.delete("q");
    }
    updateSearchParams(nextParams);
  };

  const toggleFacet = (facet: FacetDefinition, value: string) => {
    const nextParams = new URLSearchParams(location.search);
    const selectedValues = parseSelection(nextParams, facet);
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value];

    if (nextValues.length > 0) {
      nextParams.set(facet.param, nextValues.join(","));
    } else {
      nextParams.delete(facet.param);
    }
    updateSearchParams(nextParams);
  };

  const clearFilters = () => updateSearchParams(new URLSearchParams());
  const filteredUseCases = useCases.filter(
    (useCase) =>
      matchesSearch(useCase, query) && matchesFacets(useCase, selections),
  );
  const activeFilters = facetDefinitions.flatMap((facet) =>
    selections[facet.key].map((value) => ({
      facet,
      label: facet.options[value as keyof typeof facet.options],
      value,
    })),
  );

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Use cases</span>
          <h1>Using Inspektor Gadget</h1>
          <p>
            Explore how to use Gadgets for real-time debugging, export their
            signals to observability systems, or run them continuously for
            later analysis. Use the filters to find examples by platform,
            signal, integration, domain, or inspection method.
          </p>
        </div>

        {useCases.length === 0 ? (
          <div className={styles.empty}>
            <h2>No use cases published</h2>
            <p>Use cases will be listed here when they are available.</p>
          </div>
        ) : (
          <>
            <div className={styles.search}>
              <FontAwesomeIcon icon={faSearch} />
              <input
                aria-label="Search"
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Search use cases"
                type="search"
                value={query}
              />
            </div>

            <div className={styles.content}>
              <aside className={styles.facets} aria-label="Filters">
                <div className={styles.filterHeader}>
                  <strong>Filter by</strong>
                  {(activeFilters.length > 0 || query) && (
                    <button onClick={clearFilters} type="button">
                      Clear all
                    </button>
                  )}
                </div>

                {facetDefinitions.map((facet) => (
                  <fieldset className={styles.facet} key={facet.key}>
                    <legend>{facet.label}</legend>
                    {Object.entries(facet.options).map(([value, label]) => {
                      const count = useCases.filter(
                        (useCase) =>
                          matchesSearch(useCase, query) &&
                          matchesFacets(useCase, selections, facet.key) &&
                          useCase[facet.key].includes(value),
                      ).length;
                      const checked = selections[facet.key].includes(value);

                      return (
                        <label
                          className={clsx(styles.facetOption, {
                            [styles.facetOptionDisabled]: count === 0 && !checked,
                          })}
                          key={value}
                        >
                          <input
                            checked={checked}
                            disabled={count === 0 && !checked}
                            onChange={() => toggleFacet(facet, value)}
                            type="checkbox"
                          />
                          <span>{label}</span>
                          <span className={styles.count}>{count}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </aside>

              <div className={styles.results}>
                <div className={styles.resultsHeader}>
                  <strong>
                    {filteredUseCases.length}{" "}
                    {filteredUseCases.length === 1 ? "result" : "results"}
                  </strong>
                  {activeFilters.length > 0 && (
                    <div className={styles.activeFilters}>
                      {activeFilters.map(({ facet, label, value }) => (
                        <button
                          key={`${facet.key}-${value}`}
                          onClick={() => toggleFacet(facet, value)}
                          type="button"
                        >
                          {label}
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredUseCases.length > 0 ? (
                  <div className={styles.cards}>
                    {filteredUseCases.map((useCase) => (
                      <Link
                        className={clsx("card", styles.card)}
                        key={useCase.permalink}
                        to={useCase.permalink}
                      >
                        <FontAwesomeIcon
                          className={styles.cardIcon}
                          icon={useCaseIcons[useCase.icon]}
                        />
                        <span className={styles.cardContent}>
                          <strong>{useCase.title}</strong>
                          <span className={styles.description}>
                            {useCase.description}
                          </span>
                          <span className={styles.metadata}>
                            {[...useCase.platforms, ...useCase.integrations].map(
                              (value) => (
                                <span key={value}>{value}</span>
                              ),
                            )}
                          </span>
                          <span className={styles.gadget}>
                            View use case
                            <FontAwesomeIcon icon={faArrowRight} />
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <h2>No matching use cases</h2>
                    <p>Remove a filter or change the search term.</p>
                    <button onClick={clearFilters} type="button">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
