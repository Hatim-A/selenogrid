# SelenoGrid Sources

An annotated bibliography for the data, methods, and mission context used by SelenoGrid. URLs were checked on 14 November 2026. Where a publisher page is unstable, the DOI or a stable agency page is given instead.

## 1. LOLA south polar DEM, 20 m/pixel

**Product:** NASA/GSFC LRO LOLA south polar digital elevation model, `ldem_80s_20m`, PDS Geosciences Node.

**URL:** <https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/>

**Direct files:** `ldem_80s_20m.img` and `ldem_80s_20m.lbl` in that directory. The image is about 1.85 GB.

**Used for:** Every terrain quantity in SelenoGrid: site elevation, 360 degree horizon profiles, slope, aspect, open-sky fraction, horizon relief, and the 200 x 200 terrain tiles. The label supplied the 0.5 m DN scaling, the 1,737.4 km reference sphere, the 20 m pixel spacing, the polar stereographic projection, and the `-32768` no-data convention.

**Caveat:** This is a shape/radius product on a sphere, not a certified landing hazard map. Its 20 m pixels cannot resolve rocks, boulders, small craters, or roughness below that scale. Product vertical accuracy was not independently assessed for this project. The 220 km horizon ray march also has a finite truncation.

## 2. LOLA instrument paper

**Citation:** Smith, D. E., Zuber, M. T., Jackson, G. B., et al. (2010). The Lunar Orbiter Laser Altimeter Investigation on the Lunar Reconnaissance Orbiter Mission. *Space Science Reviews* 150, 209-241.

**DOI:** <https://doi.org/10.1007/s11214-009-9512-y>

**Used for:** Instrument provenance and a citable description of LOLA's measurement principle, coverage, and altimetric data products.

**Caveat:** This is an instrument and mission paper, not an accuracy assessment of the 20 m south polar gridded product. Do not cite it as the source of a specific vertical error number.

## 3. LOLA and SELENE combined DEM paper

**Citation:** Barker, M. K., Mazarico, E., Neumann, G. A., Zuber, M. T., Haruyama, J., and Smith, D. E. (2016). A new lunar digital elevation model from the Lunar Orbiter Laser Altimeter and SELENE Terrain Camera. *Icarus* 273, 346-355.

**DOI:** <https://doi.org/10.1016/j.icarus.2015.07.039>

**Used for:** Background on how LOLA altimetry is gridded and combined with stereo imagery, and on the strengths and limits of lunar DEM products.

**Caveat:** The shipped `ldem_80s_20m` product is a LOLA polar shape model, not the global LOLA plus SELENE Terrain Camera DEM described in this paper. Cite it for method context, not as the direct source of the 20 m polar grid.

## 4. NASA Artemis candidate regions announcement

**Citation:** NASA (28 October 2024). NASA Provides Update on Artemis III Moon Landing Regions.

**URL:** <https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/>

**Used for:** The names and public context of the nine candidate regions: Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, and Slater Plain. The release also lists the selection factors that motivate the tool: science potential, launch availability, terrain suitability, communication with Earth, and lighting conditions.

**Caveat:** NASA has not published official region centres or landing ellipses at this level of detail. SelenoGrid's coordinates are representative terrain points chosen from LOLA topography, not official ellipses. The release lists the regions without priority, does not rank them, and does not provide a scoring formula or weights. SelenoGrid's four-criterion TOPSIS is our own transparent simplification, not NASA's selection method. The older URL slug `nasa-identifies-candidate-landing-regions-for-artemis-iii-mission` now returns 404; use the URL above.

## 5. NASA Artemis III redefinition, October 2026

**Citation:** NASA (23 October 2026). NASA's Artemis III Mission to Test Future Moon Lander Operations.

**URL:** <https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/>

**Used for:** Current mission context. NASA redefined Artemis III as a 2027 low Earth orbit test flight with Orion and commercial lander test articles. The first crewed south-pole landing moved to Artemis IV, targeted for 2028. SelenoGrid therefore treats the 2024 nine-region set as a public reference set, not as a claim about the current Artemis III manifest.

**Caveat:** Mission plans have changed repeatedly and may change again. This page reflects the architecture described in October 2026. The tool's physics and data do not depend on the mission name.

## 6. NASA Artemis IV overview

**Citation:** NASA. Artemis IV.

**URL:** <https://www.nasa.gov/mission/artemis-iv/>

**Used for:** The current first crewed landing mission context, including the 2028 target and the south-pole campaign.

**Caveat:** This is a mission overview page, not a site-selection document. It does not publish landing ellipses or guarantee that any specific 2024 candidate region will be used.

## 7. TOPSIS site-selection precedent

**Citation:** Peña-Asensio, E., Neira-Acosta, Á.-S., and Sánchez-Lozano, J. M. (2025). Evaluating potential landing sites for the Artemis III mission using a multi-criteria decision making approach. *Acta Astronautica* 226, 469-478. arXiv version: 2024, arXiv:2406.19863.

**URLs:** <https://arxiv.org/abs/2406.19863> and <https://doi.org/10.1016/j.actaastro.2024.10.049>

**Used for:** The precedent for using TOPSIS for Artemis south-pole site selection, and for the argument that illumination, communication, terrain, and science criteria should be combined transparently. The paper evaluates 1,247 locations within 13 candidate regions and Site 004 using GIS and MCDM, with criteria including surface visibility, line of sight, PSRs, sunlight, direct Earth communication, geology, and mafic mineral abundance.

**Caveat:** SelenoGrid is not a reproduction of this study. We use four criteria, a different site set, a different DEM workflow, and a thin explainable TOPSIS layer. Their criteria weights and site coordinates are not ours. Their optimal point, DM2 at Nobile Rim 2 (about 84.20156 degrees south, 60.69989 degrees east), is not the same as SelenoGrid's representative Nobile Rim 2 point (84.1386 degrees south, 59.7200 degrees east). Cite the paper as methodological context, not as validation of our ranking.

## 8. Astronomical algorithms

**Citation:** Meeus, J. (1998). *Astronomical Algorithms*, 2nd edition. Willmann-Bell, Richmond, Virginia. ISBN 978-0-943396-61-3.

**Record:** <https://books.google.com/books/about/Astronomical_Algorithms.html?id=WSo6PgAACAAJ>

**Used for:** Chapter 25 for the Sun's position and chapter 47 for the truncated ELP-2000/82 lunar theory. The implementation follows those series and applies the standard nutation, aberration, and additive corrections described there.

**Caveat:** The lunar theory is truncated, not a full JPL DE ephemeris. The code treats UTC as TT and does not apply light-time iteration or relativistic deflection. The book has no stable publisher page because Willmann-Bell closed; the ISBN and Google Books record are the durable identifiers.

## 9. IAU lunar orientation model

**Citation:** Archinal, B. A., A'Hearn, M. F., Bowell, E., et al. (2011). Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements: 2009. *Celestial Mechanics and Dynamical Astronomy* 109, 101-135.

**DOI:** <https://doi.org/10.1007/s10569-010-9320-4>

**Used for:** The IAU 2009 mean-Earth/polar-axis lunar orientation model: the polynomial expressions for the pole right ascension and declination, the prime meridian angle W, and the 13 periodic terms used to build the body-fixed-to-J2000 rotation.

**Caveat:** The IAU model is a standard analytical model, not a numerical ephemeris. Its periodic terms are truncated, and the frame is mean-Earth/polar-axis rather than a true-equinox frame. At the 0.02 degree screening level it is appropriate; for flight dynamics, use a full JPL DE and the mission's frame conventions.

## 10. JPL Horizons

**Service:** NASA/JPL Solar System Dynamics, Horizons system.

**URL:** <https://ssd.jpl.nasa.gov/horizons/>

**Used for:** Independent validation of Sun and Earth apparent azimuth, elevation, and Earth angular diameter at a Shackleton-area site on 2026-11-14 at 12:00 UTC. The residuals are reported in the README and method document.

**Caveat:** Horizons results depend on the query configuration: target, observer, time scale, frame, and whether apparent or geometric quantities are requested. The comparison is a spot check, not a formal uncertainty budget. It does not validate the terrain horizon or the combined visibility calculation.

## 11. NASA LRO LOLA mission page

**Citation:** NASA Science. Lunar Reconnaissance Orbiter: Lunar Orbiter Laser Altimeter.

**URL:** <https://science.nasa.gov/mission/lro/lola/>

**Used for:** Public-facing instrument context and a stable NASA entry point for readers who want an overview before going to the PDS data.

**Caveat:** This is an outreach and mission summary page, not the data product specification. Use the PDS label for scaling, projection, and no-data details.

## 12. PDS LOLA data node

**Citation:** NASA Planetary Data System, Geosciences Node. LRO LOLA.

**URL:** <https://pds-geosciences.wustl.edu/missions/lro/lola.htm>

**Used for:** The data archive entry point and the provenance chain for the south polar DEM.

**Caveat:** The node is a directory and mission index, not a single citable dataset. Cite the specific product and label used (`ldem_80s_20m`) rather than the node alone.

## 13. NASA IM-2 / Athena mission page

**Citation:** NASA. CLPS Landing: Intuitive Machines (IM-2).

**URL:** <https://www.nasa.gov/event/clps-landing-intuitive-machines-im-2/>

**Used for:** Context for the Mons Mouton Plateau representative point. NASA describes IM-2 as targeting Mons Mouton, a plateau near the lunar south pole, with the Nova-C lander Athena. The plateau is the same broad terrain feature used for the SelenoGrid point.

**Caveat:** This is a target-area description, not the exact coordinates of the SelenoGrid representative point. The mission did not land at the point used here, and the point is not an official IM-2 site.

## 14. NASA IM-2 post-landing release

**Citation:** NASA (7 March 2025). NASA Receives Some Data Before Intuitive Machines Ends Lunar Mission.

**URL:** <https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/>

**Used for:** Accurate outcome context. IM-2 touched down about 400 m from its intended Mons Mouton site, came to rest on its side, and ended the mission early after collecting some data.

**Caveat:** The release is preliminary mission reporting, not a terrain validation. The outcome does not confirm or refute the suitability of the representative point, and it should not be used as evidence for or against the ranking.

## 15. LOLA DEM label

**Product label:** `ldem_80s_20m.lbl`, PDS Geosciences Node.

**URL:** <https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl>

**Used for:** The exact data contract: 30,400 x 30,400 lines and samples, 16-bit signed little-endian integers, 0.5 m per DN, 1,737.4 km offset, `-32768` no-data, polar stereographic projection, and the mean Earth/polar axis coordinate system of DE421.

**Caveat:** The label describes the product, not its accuracy. It also notes that the product is a shape map (radius), not a planetopotential topography. SelenoGrid's "elevation" is height above the reference sphere.
